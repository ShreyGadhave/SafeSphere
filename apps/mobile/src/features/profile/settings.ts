import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * Device-level safety preferences (AI triggers, siren). Read by the SOS / detection features via
 * `useSafetySettings()` or `getSafetySettings()`; edited from the Profile tab and Home toggles.
 */
export const SAFETY_SETTINGS_KEY = 'safesphere.settings';

export type SafetySettings = {
  /** ML-4 fall / snatch detection. */
  fallDetection: boolean;
  /** ML-3 scream detection (listens only during trips). */
  screamDetection: boolean;
  /** Shake-pattern SOS fallback. */
  shake: boolean;
  /** Loud siren during SOS instead of silent mode. */
  sirenMode: boolean;
};

export const DEFAULT_SAFETY_SETTINGS: SafetySettings = {
  fallDetection: true,
  screamDetection: true,
  shake: false,
  sirenMode: false,
};

let current: SafetySettings = DEFAULT_SAFETY_SETTINGS;
let loaded = false;
let loading: Promise<SafetySettings> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Loads (once) and returns the saved settings, merged over defaults. */
export function getSafetySettings(): Promise<SafetySettings> {
  if (loaded) return Promise.resolve(current);
  loading ??= AsyncStorage.getItem(SAFETY_SETTINGS_KEY)
    .then((raw) => {
      current = { ...DEFAULT_SAFETY_SETTINGS, ...(raw ? (JSON.parse(raw) as Partial<SafetySettings>) : {}) };
      return current;
    })
    .catch(() => current)
    .finally(() => {
      loaded = true;
      loading = null;
      emit();
    });
  return loading;
}

export async function updateSafetySettings(patch: Partial<SafetySettings>): Promise<void> {
  current = { ...current, ...patch };
  emit();
  await AsyncStorage.setItem(SAFETY_SETTINGS_KEY, JSON.stringify(current));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loaded) void getSafetySettings();
  return () => listeners.delete(listener);
}

/** Live safety settings + an updater. `loaded` is false until AsyncStorage has been read. */
export function useSafetySettings() {
  const settings = useSyncExternalStore(subscribe, () => current);
  const isLoaded = useSyncExternalStore(subscribe, () => loaded);
  return { settings, loaded: isLoaded, update: updateSafetySettings };
}
