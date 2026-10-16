import { useSyncExternalStore } from 'react';

import { hasPins } from '@/lib/pin';

/**
 * Whether this device has safety PINs set — part of "is onboarding finished?". SecureStore reads are
 * async, so we cache the answer in a tiny store and refresh it whenever PINs are set or cleared.
 */

let value: boolean | undefined;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Re-reads SecureStore. Call after `setPins` / `clearPins`. */
export function refreshPinsReady(): Promise<void> {
  loading = hasPins()
    .then((ready) => {
      value = ready;
    })
    .catch(() => {
      value = false;
    })
    .finally(() => {
      loading = null;
      emit();
    });
  return loading;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (value === undefined && !loading) void refreshPinsReady();
  return () => listeners.delete(listener);
}

/** `undefined` while loading. */
export function usePinsReady(): boolean | undefined {
  return useSyncExternalStore(subscribe, () => value);
}
