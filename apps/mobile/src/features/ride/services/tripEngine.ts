import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Share } from 'react-native';

import { triggerSos } from '@/features/sos';
import { toEwkt } from '@/features/sos/services/location';
import { write } from '@/features/sos/services/outbox';
import { readCachedRecipients } from '@/features/sos/services/recipients';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

import { sendSms } from '../../../../modules/safesphere-telephony';
import { type ActiveTrip, appendTrack, loadTrip, saveTrip, updateTrip } from '../state/tripStore';
import { type Anomaly, checkAnomaly, distanceM, type LatLng, type TrackPoint } from './anomaly';
import { ANOMALY_THRESHOLD, anomalyKind, anomalyProbability, PERSIST_FIXES, tripFeatures } from './anomalyModel';
import { expectedRoutes } from './routes';

export const TRIP_LOCATION_TASK = 'safesphere-trip-location';
const HEARTBEAT_MS = 30_000;
const ARRIVED_M = 120;
const ALERT_COOLDOWN_MS = 5 * 60_000;

export const ISSUE_TEXT: Record<string, string> = {
  off_route: 'Left the expected route',
  unexpected_stop: 'Stopped for a long time',
  heading_away: 'Moving away from the destination',
  overdue: 'Running much later than expected',
};

export type StartTripParams = {
  mode: 'ride' | 'walk';
  origin: LatLng;
  destination: LatLng & { name: string };
  cab?: ActiveTrip['cab'];
  shareText?: string | null;
  /** Walk check-in: "I'll be there in N minutes" overrides the routed duration. */
  arriveInMin?: number | null;
};

export async function startTrip(p: StartTripParams): Promise<ActiveTrip> {
  const routes = await expectedRoutes(p.origin, p.destination, p.mode === 'ride' ? 'drive' : 'walk');
  const plannedDurationS = p.arriveInMin ? p.arriveInMin * 60 : (routes[0]?.durationS ?? null);
  const now = Date.now();
  const trip: ActiveTrip = {
    tripId: Crypto.randomUUID(),
    mode: p.mode,
    origin: p.origin,
    destination: p.destination,
    routes: routes.map((r) => r.polyline),
    startedAt: now,
    expectedArrivalAt: plannedDurationS ? now + plannedDurationS * 1000 : null,
    plannedDurationS,
    cab: p.cab ?? null,
    lastHeartbeatAt: now,
    lastAlertAt: {},
    status: 'monitoring',
    lastIssue: null,
    modelRun: 0,
  };

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (userId) {
    await write({
      kind: 'insert',
      table: 'trips',
      row: {
        id: trip.tripId,
        user_id: userId,
        mode: p.mode,
        origin: toEwkt(p.origin.lat, p.origin.lng),
        destination: toEwkt(p.destination.lat, p.destination.lng),
        destination_name: p.destination.name,
        expected_routes: routes.map((r) => ({ duration_s: r.durationS, distance_m: r.distanceM })),
        cab_provider: p.cab?.provider ?? null,
        driver_name: p.cab?.driverName ?? null,
        vehicle_plate: p.cab?.plate ?? null,
        vehicle_description: p.cab?.vehicle ?? null,
        share_text: p.shareText ?? null,
        expected_arrival_at: trip.expectedArrivalAt ? new Date(trip.expectedArrivalAt).toISOString() : null,
        last_heartbeat_at: new Date(now).toISOString(),
      },
    });
  }
  await saveTrip(trip);

  await Location.startLocationUpdatesAsync(TRIP_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 10_000,
    distanceInterval: 15,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: p.mode === 'ride' ? 'SafeSphere is watching your ride' : 'SafeSphere is watching your walk',
      notificationBody: `To ${p.destination.name}. Tap to open.`,
      notificationColor: '#0E1726',
    },
  });
  return trip;
}

export async function endTrip(status: 'completed' | 'cancelled'): Promise<void> {
  const trip = await loadTrip();
  if (await Location.hasStartedLocationUpdatesAsync(TRIP_LOCATION_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(TRIP_LOCATION_TASK);
  }
  if (trip) {
    await write({
      kind: 'update',
      table: 'trips',
      match: { id: trip.tripId },
      values: { status, ended_at: new Date().toISOString() },
    });
  }
  await saveTrip(null);
}

/** Shares a live link to this trip (or a plain map link before the trip reaches the server). */
export async function shareTrip(trip: ActiveTrip, at: LatLng | null): Promise<void> {
  let link: string | null = null;
  if (env.shareBaseUrl) {
    const { data } = await supabase.from('trips').select('share_token').eq('id', trip.tripId).maybeSingle();
    if (data?.share_token) link = `${env.shareBaseUrl}/trip/${data.share_token}`;
  }
  link ??= at ? `https://maps.google.com/?q=${at.lat},${at.lng}` : null;
  const cab = trip.cab?.plate ? ` in ${trip.cab.vehicle ?? 'a cab'} ${trip.cab.plate}` : '';
  await Share.share({ message: `I am on my way to ${trip.destination.name}${cab}. Follow my trip: ${link ?? ''}`.trim() });
}

async function notifyArrived(trip: ActiveTrip): Promise<void> {
  const { contacts, fullName } = await readCachedRecipients();
  const first = fullName.split(' ')[0] || 'I';
  const msg = `${first} reached ${trip.destination.name} safely (SafeSphere).`;
  await Promise.all(contacts.slice(0, 3).map((c) => sendSms(c.phone, msg).catch(() => null)));
}

/** Runs inside the background location task for every batch of fixes. */
export async function onTripLocations(locations: Location.LocationObject[]): Promise<void> {
  const trip = await loadTrip();
  if (!trip || !locations.length) return;

  const points: TrackPoint[] = locations.map((l) => ({
    lat: l.coords.latitude,
    lng: l.coords.longitude,
    t: l.timestamp,
    speed: l.coords.speed,
  }));
  const track = await appendTrack(points);
  for (const l of locations) {
    await write({
      kind: 'insert',
      table: 'trip_points',
      row: {
        trip_id: trip.tripId,
        location: toEwkt(l.coords.latitude, l.coords.longitude),
        accuracy_m: l.coords.accuracy,
        speed_mps: l.coords.speed,
        heading_deg: l.coords.heading,
        recorded_at: new Date(l.timestamp).toISOString(),
      },
    });
  }

  const now = Date.now();
  if (now - trip.lastHeartbeatAt >= HEARTBEAT_MS) {
    await write({
      kind: 'update',
      table: 'trips',
      match: { id: trip.tripId },
      values: { last_heartbeat_at: new Date(now).toISOString() },
    });
    await updateTrip({ lastHeartbeatAt: now });
  }

  const last = points[points.length - 1];
  if (distanceM(last, trip.destination) <= ARRIVED_M) {
    await updateTrip({ status: 'arrived' });
    await notifyArrived(trip);
    await endTrip('completed');
    return;
  }

  // ML-5: the XGBoost model must stay above its threshold for several consecutive fixes.
  const ctx = {
    routes: trip.routes,
    origin: trip.origin,
    destination: trip.destination,
    startedAt: trip.startedAt,
    expectedArrivalAt: trip.expectedArrivalAt,
    plannedDurationS: trip.plannedDurationS,
  };
  const row = tripFeatures(track, ctx);
  const probability = anomalyProbability(row);
  const modelRun = probability >= ANOMALY_THRESHOLD ? (trip.modelRun ?? 0) + 1 : 0;
  await updateTrip({ modelRun });
  let anomaly: Anomaly | null =
    modelRun >= PERSIST_FIXES
      ? { kind: anomalyKind(row), score: probability, details: { probability, deviation_m: Math.round(row[0]) } }
      : null;
  // Lateness is not a model feature; the overdue rule covers it.
  const rule = checkAnomaly(track, ctx);
  if (!anomaly && rule?.kind === 'overdue') anomaly = rule;
  if (!anomaly || now - (trip.lastAlertAt[anomaly.kind] ?? 0) < ALERT_COOLDOWN_MS) return;

  await updateTrip({
    status: 'checking',
    lastIssue: ISSUE_TEXT[anomaly.kind],
    lastAlertAt: { ...trip.lastAlertAt, [anomaly.kind]: now },
  });
  await write({
    kind: 'insert',
    table: 'trip_anomalies',
    row: { trip_id: trip.tripId, kind: anomaly.kind, score: anomaly.score, details: anomaly.details },
  });
  // Wakes the user if the app is in the background; the in-app check runs the 10 s countdown.
  await Notifications.scheduleNotificationAsync({
    content: {
      title: trip.mode === 'ride' ? 'Your ride changed course' : 'Are you OK?',
      body: `${ISSUE_TEXT[anomaly.kind]}. Open SafeSphere to confirm you are safe.`,
    },
    trigger: null,
  }).catch(() => null);
  triggerSos({ source: trip.mode === 'ride' ? 'ride_anomaly' : 'walk_checkin', requireConfirm: true });
}

/** Called when the user answers the check-in "I'm OK": logs the false alarm for ML-5 feedback. */
export async function markTripOk(): Promise<void> {
  const trip = await updateTrip({ status: 'monitoring', lastIssue: null });
  if (!trip) return;
  await write({
    kind: 'update',
    table: 'trip_anomalies',
    match: { trip_id: trip.tripId, user_response: 'pending' },
    values: { user_response: 'ok', responded_at: new Date().toISOString() },
  });
}
