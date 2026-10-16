/**
 * Journey anomaly rules (ML-5, on-device part). Pure functions over the recent GPS track so they
 * are testable and can run inside the background location task.
 *
 * Rules (PLAN §3.4):
 *  - off_route:       > OFF_ROUTE_M from every expected route for ≥ 30 s AND moving away from
 *                     the destination over that span
 *  - unexpected_stop: within STOP_RADIUS_M for ≥ STOP_S while still > 300 m from destination
 *  - heading_away:    distance to destination grew by > 500 m over the last 3 min
 *  - overdue:         now > expected arrival + max(10 min, 50 % of the planned duration)
 * "gps_silent" is detected by the server (no heartbeat), not here.
 */

export type TrackPoint = { lat: number; lng: number; t: number /* ms */; speed?: number | null };
export type LatLng = { lat: number; lng: number };
export type AnomalyKind = 'off_route' | 'unexpected_stop' | 'heading_away' | 'overdue';
export type Anomaly = { kind: AnomalyKind; score: number; details: Record<string, number> };

export type TripContext = {
  routes: LatLng[][];
  destination: LatLng;
  startedAt: number;
  expectedArrivalAt: number | null;
  plannedDurationS: number | null;
};

export const RULES = {
  OFF_ROUTE_M: 150,
  OFF_ROUTE_MIN_S: 30,
  STOP_RADIUS_M: 30,
  STOP_S: 4 * 60,
  NEAR_DESTINATION_M: 300,
  HEADING_AWAY_M: 500,
  HEADING_WINDOW_S: 3 * 60,
  OVERDUE_MIN_S: 10 * 60,
} as const;

const R = 6_371_000;
const RAD = Math.PI / 180;

export function distanceM(a: LatLng, b: LatLng): number {
  const x = (b.lng - a.lng) * RAD * Math.cos(((a.lat + b.lat) / 2) * RAD);
  const y = (b.lat - a.lat) * RAD;
  return Math.hypot(x, y) * R;
}

/** Shortest distance from a point to a polyline, in metres (local flat projection). */
export function distanceToPolylineM(p: LatLng, line: LatLng[]): number {
  if (line.length === 0) return Infinity;
  if (line.length === 1) return distanceM(p, line[0]);
  const kx = Math.cos(p.lat * RAD) * RAD * R;
  const ky = RAD * R;
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const ax = (line[i].lng - p.lng) * kx;
    const ay = (line[i].lat - p.lat) * ky;
    const bx = (line[i + 1].lng - p.lng) * kx;
    const by = (line[i + 1].lat - p.lat) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}

export function distanceToRoutesM(p: LatLng, routes: LatLng[][]): number {
  return routes.reduce((best, r) => Math.min(best, distanceToPolylineM(p, r)), Infinity);
}

/** Points from the last `seconds` of the track (track is ordered by time). */
function window(track: TrackPoint[], seconds: number): TrackPoint[] {
  const last = track[track.length - 1];
  return track.filter((p) => last.t - p.t <= seconds * 1000);
}

export function checkAnomaly(track: TrackPoint[], ctx: TripContext, now = Date.now()): Anomaly | null {
  if (track.length === 0) return null;
  const last = track[track.length - 1];
  const toDest = distanceM(last, ctx.destination);

  // Overdue
  if (ctx.expectedArrivalAt != null && ctx.plannedDurationS != null) {
    const grace = Math.max(RULES.OVERDUE_MIN_S, 0.5 * ctx.plannedDurationS) * 1000;
    if (now > ctx.expectedArrivalAt + grace && toDest > RULES.NEAR_DESTINATION_M) {
      return { kind: 'overdue', score: 0.6, details: { late_s: Math.round((now - ctx.expectedArrivalAt) / 1000), to_dest_m: Math.round(toDest) } };
    }
  }

  // Off route: every point in the last 30 s is off all routes, and we are moving away.
  const recent = window(track, RULES.OFF_ROUTE_MIN_S);
  if (ctx.routes.length && recent.length >= 2 && (last.t - recent[0].t) / 1000 >= RULES.OFF_ROUTE_MIN_S * 0.8) {
    const devs = recent.map((p) => distanceToRoutesM(p, ctx.routes));
    const minDev = Math.min(...devs);
    const away = toDest - distanceM(recent[0], ctx.destination);
    if (minDev > RULES.OFF_ROUTE_M && away > 0) {
      return {
        kind: 'off_route',
        score: Math.min(1, 0.5 + minDev / 1000),
        details: { deviation_m: Math.round(minDev), moved_away_m: Math.round(away) },
      };
    }
  }

  // Unexpected stop: stayed within a small radius for ≥ 4 min, not near the destination.
  const stopWin = window(track, RULES.STOP_S);
  if (stopWin.length >= 2 && (last.t - stopWin[0].t) / 1000 >= RULES.STOP_S * 0.95 && toDest > RULES.NEAR_DESTINATION_M) {
    const spread = Math.max(...stopWin.map((p) => distanceM(p, last)));
    if (spread <= RULES.STOP_RADIUS_M) {
      return { kind: 'unexpected_stop', score: 0.55, details: { stopped_s: Math.round((last.t - stopWin[0].t) / 1000), to_dest_m: Math.round(toDest) } };
    }
  }

  // Heading away: distance to destination grew a lot over the last 3 min.
  const headWin = window(track, RULES.HEADING_WINDOW_S);
  if (headWin.length >= 2) {
    const grew = toDest - distanceM(headWin[0], ctx.destination);
    if (grew > RULES.HEADING_AWAY_M) {
      return { kind: 'heading_away', score: Math.min(1, 0.5 + grew / 3000), details: { moved_away_m: Math.round(grew) } };
    }
  }
  return null;
}
