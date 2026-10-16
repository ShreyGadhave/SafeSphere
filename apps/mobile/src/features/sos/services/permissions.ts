/**
 * Runtime permissions the SOS needs. Kept behind one function so it can later be swapped for the
 * shared `@/lib/permissions` helper without touching the engine.
 *
 * Nothing here blocks an SOS: a missing permission only disables that one channel, and the
 * engine records which channels were unavailable in the timeline.
 */

import * as Location from 'expo-location';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import { PermissionsAndroid, Platform } from 'react-native';

export type SosPermissions = {
  sms: boolean;
  call: boolean;
  location: boolean;
  backgroundLocation: boolean;
  microphone: boolean;
};

async function androidPermissions(): Promise<{ sms: boolean; call: boolean }> {
  if (Platform.OS !== 'android') return { sms: false, call: false };
  const P = PermissionsAndroid.PERMISSIONS;
  const result = await PermissionsAndroid.requestMultiple([P.SEND_SMS, P.CALL_PHONE]);
  const granted = PermissionsAndroid.RESULTS.GRANTED;
  return { sms: result[P.SEND_SMS] === granted, call: result[P.CALL_PHONE] === granted };
}

/**
 * Requests whatever is missing. Android only shows a dialog for permissions not yet decided,
 * so calling this at SOS time is cheap when onboarding already granted everything.
 */
export async function ensureSosPermissions(): Promise<SosPermissions> {
  const [telephony, fg, mic] = await Promise.all([
    androidPermissions().catch(() => ({ sms: false, call: false })),
    Location.requestForegroundPermissionsAsync().catch(() => null),
    requestRecordingPermissionsAsync().catch(() => null),
  ]);
  const location = fg?.granted ?? false;
  let backgroundLocation = false;
  if (location) {
    // Android shows "Allow all the time" as a separate step; do it only after foreground is granted.
    backgroundLocation = (await Location.requestBackgroundPermissionsAsync().catch(() => null))?.granted ?? false;
  }
  return { ...telephony, location, backgroundLocation, microphone: mic?.granted ?? false };
}
