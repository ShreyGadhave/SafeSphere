import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * Push notifications. The phone only registers its Expo push token; sending happens in the
 * database (migration 0009: an alert insert pushes to the user's contacts who use the app and to
 * verified guardians within 5 km). Payload data: { alertId, role: 'contact' | 'guardian' }.
 */

export const SOS_CHANNEL_ID = 'sos';

// Show SOS pushes even while the app is open — they are always urgent.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureSosChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(SOS_CHANNEL_ID, {
    name: 'SOS alerts',
    description: 'Someone you know or someone nearby needs help',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 300, 500],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });
}

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Gets this device's Expo push token (asking for permission if needed) and stores it for the user. */
export async function registerPushToken(userId: string): Promise<string | null> {
  await ensureSosChannel();
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
  const { error } = await supabase
    .from('push_tokens')
    .upsert({ token, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'token' });
  if (error) throw error;
  return token;
}

/** Removes this device's token on sign-out so the previous user stops receiving pushes here. */
export async function unregisterPushToken(): Promise<void> {
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    await supabase.from('push_tokens').delete().eq('token', token);
  } catch {
    // No token on this device — nothing to remove.
  }
}

/**
 * Registers the push token for the signed-in user (and again if Expo rotates it). Tapping a
 * notification opens the app; the guardian response screen arrives with the guardian feature.
 */
export function usePushRegistration(userId: string | null): void {
  useEffect(() => {
    if (!userId) return;
    registerPushToken(userId).catch((e) => console.warn('[push] registration failed:', e));
    const tokenSub = Notifications.addPushTokenListener(() => {
      registerPushToken(userId).catch((e) => console.warn('[push] re-registration failed:', e));
    });
    const tapSub = Notifications.addNotificationResponseReceivedListener(() => {
      // TODO(guardians F2): route to the guardian response screen with data.alertId.
      router.navigate('/');
    });
    return () => {
      tokenSub.remove();
      tapSub.remove();
    };
  }, [userId]);
}
