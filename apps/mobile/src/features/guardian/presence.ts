import * as Location from 'expo-location';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useProfile } from '@/features/profile/hooks/useProfile';
import { toEwkt } from '@/features/sos/services/location';
import { supabase } from '@/lib/supabase';

const REFRESH_MS = 5 * 60_000;

/** Stores this guardian's position so SOS pushes within 5 km can reach them (F2). */
export async function updateGuardianLocation(userId: string): Promise<void> {
  const fix = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 }).catch(() => null);
  const loc = fix ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null));
  if (!loc) return;
  await supabase
    .from('profiles')
    .update({ last_location: toEwkt(loc.coords.latitude, loc.coords.longitude), last_location_at: new Date().toISOString() })
    .eq('id', userId);
}

/**
 * While a verified guardian is "available", refresh their position every 5 minutes and whenever
 * the app comes to the foreground. The server only pushes to guardians seen in the last 30 min.
 */
export function useGuardianPresence(): void {
  const profile = useProfile();
  const p = profile.data;
  const active = p?.guardian_status === 'verified' && p.guardian_available;
  const userId = p?.id;

  useEffect(() => {
    if (!active || !userId) return;
    void updateGuardianLocation(userId);
    const timer = setInterval(() => void updateGuardianLocation(userId), REFRESH_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void updateGuardianLocation(userId);
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [active, userId]);
}
