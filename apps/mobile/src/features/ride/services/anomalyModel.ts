import model from '../../../../assets/models/anomaly_model.json';
import { distanceM, distanceToRoutesM, type LatLng, type TrackPoint } from './anomaly';

/**
 * ML-5 on the phone: the XGBoost journey-anomaly model trained on simulated Mumbai cab trips
 * (ml/src/safesphere_ml/anomaly/simulate_train.py), evaluated tree by tree in plain JS.
 * Held-out results: 97.5 % of anomalous trips detected, 4.3 % of normal trips with any alarm,
 * median delay 80 s — versus 72.8 % / 13 % / 130 s for the hand-written rules.
 */

type Tree = { f: number[]; t: number[]; y: number[]; n: number[]; m: number[]; v: number[] };
const TREES = model.trees as Tree[];
export const ANOMALY_THRESHOLD = model.threshold;
export const PERSIST_FIXES = model.persist_fixes;

/** Probability that the trip is anomalous at this fix. Features in `model.features` order. */
export function anomalyProbability(row: number[]): number {
  let margin = model.base_margin;
  for (const tree of TREES) {
    let node = 0;
    while (tree.f[node] !== -1) {
      const x = row[tree.f[node]];
      node = Number.isNaN(x) ? tree.m[node] : x < tree.t[node] ? tree.y[node] : tree.n[node];
    }
    margin += tree.v[node];
  }
  return 1 / (1 + Math.exp(-margin));
}

function pointAgo(track: TrackPoint[], seconds: number): TrackPoint {
  const target = track[track.length - 1].t - seconds * 1000;
  for (let i = track.length - 1; i >= 0; i--) if (track[i].t <= target) return track[i];
  return track[0];
}

export type FeatureContext = {
  routes: LatLng[][];
  origin: LatLng;
  destination: LatLng;
  startedAt: number;
  plannedDurationS: number | null;
};

/** The 8 features the model was trained on, computed from the live track (same definitions). */
export function tripFeatures(track: TrackPoint[], ctx: FeatureContext): number[] {
  const last = track[track.length - 1];
  const dev = (p: LatLng) => (ctx.routes.length ? distanceToRoutesM(p, ctx.routes) : 0);
  const toDest = (p: LatLng) => distanceM(p, ctx.destination);

  // dev_max_30s: smallest deviation over the last 30 s (i.e. off route the whole time)
  const recent = track.filter((p) => last.t - p.t <= 30_000);
  const devMin30 = Math.min(...recent.map(dev));

  // stopped_s: how long consecutive fixes stayed within 15 m of each other
  let stoppedSince = last.t;
  for (let i = track.length - 1; i > 0; i--) {
    if (distanceM(track[i], track[i - 1]) >= 15) break;
    stoppedSince = track[i - 1].t;
  }
  const prev = track.length > 1 ? track[track.length - 2] : last;
  const dt = Math.max(1, (last.t - prev.t) / 1000);
  const total = Math.max(1, distanceM(ctx.origin, ctx.destination));

  const row: Record<string, number> = {
    dev_m: dev(last),
    dev_max_30s: devMin30,
    away_60s: toDest(last) - toDest(pointAgo(track, 60)),
    away_180s: toDest(last) - toDest(pointAgo(track, 180)),
    stopped_s: (last.t - stoppedSince) / 1000,
    speed: track.length > 1 ? distanceM(last, prev) / dt : 0,
    time_ratio: (last.t - ctx.startedAt) / 1000 / Math.max(60, ctx.plannedDurationS ?? 0),
    progress: 1 - toDest(last) / total,
  };
  return model.features.map((f) => row[f]);
}

/** Which kind of anomaly to report to the user, from the features that fired. */
export function anomalyKind(row: number[]): 'off_route' | 'unexpected_stop' | 'heading_away' {
  const get = (name: string) => row[model.features.indexOf(name)];
  if (get('stopped_s') >= 180) return 'unexpected_stop';
  if (get('dev_max_30s') > 150) return 'off_route';
  return 'heading_away';
}
