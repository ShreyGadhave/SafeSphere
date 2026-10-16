import { NativeModule, requireOptionalNativeModule } from 'expo';

/** Outcome of an SMS send, as reported by Android for every message part. */
export type SmsResult = {
  /** True when every part was accepted by the carrier. */
  sent: boolean;
  parts: number;
  failedParts: number;
  /** Android SmsManager result codes for failed parts (e.g. 2 = RESULT_ERROR_RADIO_OFF). */
  errorCodes: number[];
  /** True when Android did not report back within 30 s (e.g. no signal). */
  timedOut: boolean;
};

declare class SafesphereTelephonyModule extends NativeModule {
  canSendSms(): boolean;
  canCall(): boolean;
  sendSms(phone: string, message: string): Promise<SmsResult>;
  placeCall(phone: string): Promise<void>;
}

// Optional so the JS bundle still loads in a build made before this module existed.
const native = requireOptionalNativeModule<SafesphereTelephonyModule>('SafesphereTelephony');

/** False in builds that don't include the native module — callers must fall back. */
export const isTelephonyAvailable = native != null;

export function canSendSms(): boolean {
  return native?.canSendSms() ?? false;
}

export function canCall(): boolean {
  return native?.canCall() ?? false;
}

/** Sends an SMS from the device's own SIM. Needs SEND_SMS permission. Works offline. */
export function sendSms(phone: string, message: string): Promise<SmsResult> {
  if (!native) return Promise.reject(new Error('SafesphereTelephony native module is not in this build'));
  return native.sendSms(phone, message);
}

/** Calls the number immediately (no dialer screen). Needs CALL_PHONE permission. */
export function placeCall(phone: string): Promise<void> {
  if (!native) return Promise.reject(new Error('SafesphereTelephony native module is not in this build'));
  return native.placeCall(phone);
}
