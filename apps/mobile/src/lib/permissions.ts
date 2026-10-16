import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import * as Contacts from 'expo-contacts';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Linking, PermissionsAndroid, Platform, type Permission } from 'react-native';

/**
 * Every runtime permission SafeSphere asks for, in one place, with the reason we show the user.
 * Screens and services (onboarding, profile, SOS, trips) call this instead of the individual
 * Expo / React Native APIs, so status handling stays consistent.
 */

export type PermissionKind =
  | 'location'
  | 'backgroundLocation'
  | 'microphone'
  | 'notifications'
  | 'contacts'
  | 'sms'
  | 'phone';

/**
 * - `granted`: allowed.
 * - `undetermined`: not asked yet (or Android can't tell yet) — `requestPermission` will show the dialog.
 * - `denied`: refused, can be asked again.
 * - `blocked`: refused permanently — only the app's system settings can change it (`openAppSettings`).
 */
export type PermissionState = 'granted' | 'undetermined' | 'denied' | 'blocked';

export type PermissionInfo = {
  title: string;
  reason: string;
  /** SOS can't do its core job without it; we warn (but never block) when it's missing. */
  essential: boolean;
};

export const PERMISSION_INFO: Record<PermissionKind, PermissionInfo> = {
  location: {
    title: 'Location',
    reason: 'Attaches your exact location to an SOS and shows the risk around you.',
    essential: true,
  },
  backgroundLocation: {
    title: 'Location all the time',
    reason: 'Keeps your trip and SOS location updating when the screen is off. Choose “Allow all the time”.',
    essential: true,
  },
  sms: {
    title: 'Send SMS',
    reason: 'Sends your SOS text from your own number, so it works even without internet.',
    essential: true,
  },
  phone: {
    title: 'Phone calls',
    reason: 'Calls your primary contact automatically during an SOS.',
    essential: true,
  },
  microphone: {
    title: 'Microphone',
    reason: 'Records audio evidence during an SOS and powers scream detection. Audio stays on your phone unless an SOS is active.',
    essential: false,
  },
  notifications: {
    title: 'Notifications',
    reason: 'Tells you when someone nearby needs help and when a trip check-in is due.',
    essential: false,
  },
  contacts: {
    title: 'Contacts',
    reason: 'Lets you pick emergency contacts from your phone book. Nothing is uploaded except the ones you choose.',
    essential: false,
  },
};

/** The order we ask in: foreground location must come before "all the time". */
export const PERMISSION_ORDER: PermissionKind[] = [
  'location',
  'backgroundLocation',
  'sms',
  'phone',
  'microphone',
  'notifications',
  'contacts',
];

type ExpoLikeResponse = { granted: boolean; status: string; canAskAgain: boolean };

function fromExpo(response: ExpoLikeResponse): PermissionState {
  if (response.granted) return 'granted';
  if (response.status === 'undetermined') return 'undetermined';
  return response.canAskAgain ? 'denied' : 'blocked';
}

function fromAndroidResult(result: string): PermissionState {
  if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'blocked';
  return 'denied';
}

const ANDROID_PERMISSION: Partial<Record<PermissionKind, Permission>> = {
  sms: PermissionsAndroid.PERMISSIONS.SEND_SMS,
  phone: PermissionsAndroid.PERMISSIONS.CALL_PHONE,
};

export async function getPermissionStatus(kind: PermissionKind): Promise<PermissionState> {
  try {
    switch (kind) {
      case 'location':
        return fromExpo(await Location.getForegroundPermissionsAsync());
      case 'backgroundLocation':
        return fromExpo(await Location.getBackgroundPermissionsAsync());
      case 'microphone':
        return fromExpo(await getRecordingPermissionsAsync());
      case 'notifications':
        return fromExpo(await Notifications.getPermissionsAsync());
      case 'contacts':
        return fromExpo(await Contacts.getPermissionsAsync());
      case 'sms':
      case 'phone': {
        if (Platform.OS !== 'android') return 'blocked';
        // `check` can't tell "never asked" from "denied"; report undetermined so the UI offers to ask.
        return (await PermissionsAndroid.check(ANDROID_PERMISSION[kind]!)) ? 'granted' : 'undetermined';
      }
    }
  } catch {
    return 'undetermined';
  }
}

export async function getPermissionStatuses(): Promise<Record<PermissionKind, PermissionState>> {
  const entries = await Promise.all(
    PERMISSION_ORDER.map(async (kind) => [kind, await getPermissionStatus(kind)] as const),
  );
  return Object.fromEntries(entries) as Record<PermissionKind, PermissionState>;
}

/** Shows the system dialog (if Android still allows it) and returns the resulting state. */
export async function requestPermission(kind: PermissionKind): Promise<PermissionState> {
  try {
    switch (kind) {
      case 'location':
        return fromExpo(await Location.requestForegroundPermissionsAsync());
      case 'backgroundLocation': {
        // Android 10+ only grants "all the time" after foreground location is granted.
        const foreground = await Location.requestForegroundPermissionsAsync();
        if (!foreground.granted) return fromExpo(foreground);
        return fromExpo(await Location.requestBackgroundPermissionsAsync());
      }
      case 'microphone':
        return fromExpo(await requestRecordingPermissionsAsync());
      case 'notifications':
        return fromExpo(await Notifications.requestPermissionsAsync());
      case 'contacts':
        return fromExpo(await Contacts.requestPermissionsAsync());
      case 'sms':
      case 'phone': {
        if (Platform.OS !== 'android') return 'blocked';
        return fromAndroidResult(await PermissionsAndroid.request(ANDROID_PERMISSION[kind]!));
      }
    }
  } catch {
    return 'denied';
  }
}

/** Opens SafeSphere's page in Android settings — the only way out of a `blocked` permission. */
export function openAppSettings(): Promise<void> {
  return Linking.openSettings();
}
