/**
 * Location for an active SOS: a fast first fix for the SMS, then a sample every 5 s written to
 * `alert_locations` for the live-tracking page and the admin dashboard.
 *
 * With "Allow all the time" granted, tracking runs as an Android foreground service (keeps
 * going with the screen off or another app open). Without it, we fall back to a foreground
 * watcher that works while SafeSphere is open.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';

// tokens only (not '@/theme'): this module also runs inside the background task, which must not pull in UI code.
import { colors } from '@/theme/tokens';

import { SOS_LOCATION_TASK, SOS_TIMING, STORAGE_KEYS } from '../constants';
import { write } from './outbox';

export type Fix = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
};

export type TrackingInfo = { alertId: string; startedAt: string; mode: 'background' | 'foreground' };

export function toEwkt(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

function toFix(loc: Location.LocationObject): Fix {
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    accuracy: loc.coords.accuracy ?? null,
    speed: loc.coords.speed ?? null,
    heading: loc.coords.heading ?? null,
    timestamp: loc.timestamp,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

/** Last known position if recent (instant), otherwise a fresh fix within ~10 s. */
export async function quickFix(): Promise<Fix | null> {
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000, requiredAccuracy: 500 });
    if (last) return toFix(last);
  } catch {
    // fall through to a fresh fix
  }
  return preciseFix(10_000);
}

export async function preciseFix(timeoutMs = 15_000): Promise<Fix | null> {
  try {
    const loc = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      timeoutMs,
    );
    return loc ? toFix(loc) : null;
  } catch {
    return null;
  }
}

export async function batteryPercent(): Promise<number | null> {
  try {
    const level = await Battery.getBatteryLevelAsync();
    return level >= 0 ? Math.round(level * 100) : null;
  } catch {
    return null;
  }
}

/** Queue one `alert_locations` row (delivered when online). */
export async function recordFix(alertId: string, fix: Fix, battery: number | null): Promise<void> {
  await write({
    kind: 'insert',
    table: 'alert_locations',
    row: {
      alert_id: alertId,
      location: toEwkt(fix.latitude, fix.longitude),
      accuracy_m: fix.accuracy,
      speed_mps: fix.speed != null && fix.speed >= 0 ? fix.speed : null,
      heading_deg: fix.heading != null && fix.heading >= 0 ? fix.heading : null,
      battery_pct: battery,
      recorded_at: new Date(fix.timestamp).toISOString(),
    },
  });
}

export async function readTracking(): Promise<TrackingInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.tracking);
    return raw ? (JSON.parse(raw) as TrackingInfo) : null;
  } catch {
    return null;
  }
}

let foregroundWatch: Location.LocationSubscription | null = null;

/** Starts 5-second tracking for `alertId`. Returns which mode is running. */
export async function startTracking(
  alertId: string,
  backgroundAllowed: boolean,
  onFix?: (fix: Fix) => void,
): Promise<TrackingInfo['mode'] | null> {
  await stopTracking();

  if (backgroundAllowed) {
    try {
      const info: TrackingInfo = { alertId, startedAt: new Date().toISOString(), mode: 'background' };
      await AsyncStorage.setItem(STORAGE_KEYS.tracking, JSON.stringify(info));
      await Location.startLocationUpdatesAsync(SOS_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: SOS_TIMING.locationIntervalMs,
        distanceInterval: 0,
        pausesUpdatesAutomatically: false,
        foregroundService: {
          // Deliberately generic so it is safe during a duress alert as well.
          notificationTitle: 'SafeSphere is sharing your location',
          notificationBody: 'Location sharing is on.',
          notificationColor: colors.danger,
          killServiceOnDestroy: false,
        },
      });
      // The background task writes rows itself; the foreground callback only updates the UI.
      if (onFix) {
        foregroundWatch = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: SOS_TIMING.locationIntervalMs },
          (loc) => onFix(toFix(loc)),
        );
      }
      return 'background';
    } catch (e) {
      console.warn('[sos] background tracking unavailable, using foreground watcher', e);
    }
  }

  try {
    const info: TrackingInfo = { alertId, startedAt: new Date().toISOString(), mode: 'foreground' };
    await AsyncStorage.setItem(STORAGE_KEYS.tracking, JSON.stringify(info));
    foregroundWatch = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: SOS_TIMING.locationIntervalMs, distanceInterval: 0 },
      (loc) => {
        const fix = toFix(loc);
        onFix?.(fix);
        void batteryPercent().then((b) => recordFix(alertId, fix, b));
      },
    );
    return 'foreground';
  } catch (e) {
    console.warn('[sos] location tracking failed', e);
    return null;
  }
}

export async function stopTracking(): Promise<void> {
  foregroundWatch?.remove();
  foregroundWatch = null;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(SOS_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(SOS_LOCATION_TASK);
    }
  } catch {
    // task was never registered in this build
  }
  await AsyncStorage.removeItem(STORAGE_KEYS.tracking).catch(() => undefined);
}
