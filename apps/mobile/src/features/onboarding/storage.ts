import AsyncStorage from '@react-native-async-storage/async-storage';

const WELCOME_SEEN_KEY = 'safesphere.onboarding.welcomeSeen';
const ONBOARDED_USER_KEY = 'safesphere.onboardedUser';

export async function getWelcomeSeen(): Promise<boolean> {
  return (await AsyncStorage.getItem(WELCOME_SEEN_KEY).catch(() => null)) === '1';
}

export async function setWelcomeSeen(): Promise<void> {
  await AsyncStorage.setItem(WELCOME_SEEN_KEY, '1');
}

/** The id of the user who last finished onboarding on this device. */
export async function getOnboardedUser(): Promise<string | null> {
  return AsyncStorage.getItem(ONBOARDED_USER_KEY).catch(() => null);
}

export async function setOnboardedUser(userId: string): Promise<void> {
  await AsyncStorage.setItem(ONBOARDED_USER_KEY, userId);
}
