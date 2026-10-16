import { useEffect, useState } from 'react';

import { useSession } from '@/features/auth/hooks/useSession';
import { usePinsReady } from '@/features/auth/pinsState';
import { useProfile } from '@/features/profile/hooks/useProfile';

import { resolveAppGate, type AppGate } from '../steps';
import { getOnboardedUser, setOnboardedUser } from '../storage';

/** Decides which part of the app the root navigator may show. */
export function useAppGate(): AppGate {
  const session = useSession();
  const userId = session?.user.id;
  const profile = useProfile();
  const pinsReady = usePinsReady();
  const [onboardedLocally, setOnboardedLocally] = useState<{ userId: string; value: boolean } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void getOnboardedUser().then((id) => {
      if (alive) setOnboardedLocally({ userId, value: id === userId });
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  // Remember "this user is onboarded on this device" for offline launches.
  const onboardedAt = profile.data?.onboarded_at;
  useEffect(() => {
    if (userId && onboardedAt && pinsReady) void setOnboardedUser(userId);
  }, [userId, onboardedAt, pinsReady]);

  return resolveAppGate({
    hasSession: session === undefined ? undefined : session != null,
    profileStatus: profile.status,
    onboardedAt,
    pinsReady,
    onboardedLocally: onboardedLocally?.userId === userId ? onboardedLocally?.value : undefined,
  });
}
