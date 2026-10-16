import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { LatLng, TrackPoint } from '../services/anomaly';

/** The active Safe Ride / Safe Walk, persisted so the background task and restarts share it. */
export type ActiveTrip = {
  tripId: string;
  mode: 'ride' | 'walk';
  origin: LatLng;
  destination: LatLng & { name: string };
  routes: LatLng[][];
  startedAt: number;
  expectedArrivalAt: number | null;
  plannedDurationS: number | null;
  cab: { provider: string | null; driverName: string | null; plate: string | null; vehicle: string | null } | null;
  lastHeartbeatAt: number;
  lastAlertAt: Partial<Record<string, number>>;
  status: 'monitoring' | 'checking' | 'arrived';
  lastIssue: string | null;
  /** Consecutive fixes the ML-5 model has scored above its threshold. */
  modelRun: number;
};

const TRIP_KEY = 'safesphere.trip.active';
const TRACK_KEY = 'safesphere.trip.track';
const TRACK_KEEP_MS = 10 * 60_000;

let current: ActiveTrip | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export async function loadTrip(): Promise<ActiveTrip | null> {
  if (!loaded) {
    const raw = await AsyncStorage.getItem(TRIP_KEY).catch(() => null);
    current = raw ? (JSON.parse(raw) as ActiveTrip) : null;
    loaded = true;
    emit();
  }
  return current;
}

export async function saveTrip(trip: ActiveTrip | null): Promise<void> {
  current = trip;
  loaded = true;
  if (trip) await AsyncStorage.setItem(TRIP_KEY, JSON.stringify(trip));
  else await AsyncStorage.multiRemove([TRIP_KEY, TRACK_KEY]);
  emit();
}

export async function updateTrip(patch: Partial<ActiveTrip>): Promise<ActiveTrip | null> {
  const trip = await loadTrip();
  if (!trip) return null;
  await saveTrip({ ...trip, ...patch });
  return current;
}

/** Appends fixes to the persisted recent track (last 10 minutes) and returns it. */
export async function appendTrack(points: TrackPoint[]): Promise<TrackPoint[]> {
  const raw = await AsyncStorage.getItem(TRACK_KEY).catch(() => null);
  const prev = raw ? (JSON.parse(raw) as TrackPoint[]) : [];
  const now = points.length ? points[points.length - 1].t : Date.now();
  const next = [...prev, ...points].filter((p) => now - p.t <= TRACK_KEEP_MS);
  await AsyncStorage.setItem(TRACK_KEY, JSON.stringify(next));
  return next;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loaded) void loadTrip();
  return () => {
    listeners.delete(listener);
  };
}

/** The active trip, live (null when there is none). */
export function useActiveTrip(): ActiveTrip | null {
  return useSyncExternalStore(subscribe, () => current);
}
