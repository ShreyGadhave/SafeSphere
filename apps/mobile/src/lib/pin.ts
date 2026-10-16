import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Safety PIN (cancels an alert) and duress PIN (looks like a cancel, silently keeps the SOS
 * going). Stored only on this device, salted + SHA-256 hashed in the Android Keystore-backed
 * SecureStore. The server never sees either PIN.
 */

const KEYS = {
  salt: 'safesphere.pin.salt',
  safe: 'safesphere.pin.safe',
  duress: 'safesphere.pin.duress',
} as const;

export const PIN_LENGTH = { min: 4, max: 6 } as const;

export type PinCheck = 'safe' | 'duress' | 'wrong';

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH.min},${PIN_LENGTH.max}}$`).test(pin);
}

async function hash(salt: string, pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

function randomSalt(): string {
  return Array.from(Crypto.getRandomBytes(16), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Saves both PINs. Throws if either is invalid or they are the same. */
export async function setPins(safePin: string, duressPin: string): Promise<void> {
  if (!isValidPin(safePin) || !isValidPin(duressPin)) {
    throw new Error(`PINs must be ${PIN_LENGTH.min}–${PIN_LENGTH.max} digits`);
  }
  if (safePin === duressPin) throw new Error('Safety PIN and duress PIN must be different');
  const salt = randomSalt();
  await SecureStore.setItemAsync(KEYS.salt, salt);
  await SecureStore.setItemAsync(KEYS.safe, await hash(salt, safePin));
  await SecureStore.setItemAsync(KEYS.duress, await hash(salt, duressPin));
}

export async function hasPins(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEYS.safe)) != null;
}

/** Compares an entered PIN with both stored hashes. */
export async function checkPin(input: string): Promise<PinCheck> {
  const salt = await SecureStore.getItemAsync(KEYS.salt);
  if (!salt || !isValidPin(input)) return 'wrong';
  const h = await hash(salt, input);
  if (h === (await SecureStore.getItemAsync(KEYS.safe))) return 'safe';
  if (h === (await SecureStore.getItemAsync(KEYS.duress))) return 'duress';
  return 'wrong';
}

export async function clearPins(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)));
}
