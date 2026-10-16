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

export type AudioChunkEvent = { pcm16: string; sampleRate: number };

type TelephonyEvents = { onAudioChunk: (event: AudioChunkEvent) => void };

declare class SafesphereTelephonyModule extends NativeModule<TelephonyEvents> {
  isCapturingAudio(): boolean;
  startAudioCapture(sampleRate: number, chunkSamples: number): Promise<void>;
  stopAudioCapture(): Promise<void>;
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

/** True in builds whose native module can stream microphone samples (scream detection). */
export function canCaptureAudio(): boolean {
  return typeof native?.startAudioCapture === 'function';
}

/**
 * Streams 16-bit mono microphone samples. Each chunk arrives as base64 PCM; decode with
 * `decodePcm16`. Needs RECORD_AUDIO. Returns a function that stops capture.
 */
export async function startAudioCapture(
  onChunk: (samples: Float32Array, sampleRate: number) => void,
  sampleRate = 16000,
  chunkSamples = 8000,
): Promise<() => Promise<void>> {
  if (!native || !canCaptureAudio()) throw new Error('Audio capture is not in this build');
  const sub = native.addListener('onAudioChunk', (e) => onChunk(decodePcm16(e.pcm16), e.sampleRate));
  try {
    await native.startAudioCapture(sampleRate, chunkSamples);
  } catch (err) {
    sub.remove();
    throw err;
  }
  return async () => {
    sub.remove();
    await native.stopAudioCapture();
  };
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_INDEX = new Uint8Array(128);
for (let i = 0; i < B64.length; i++) B64_INDEX[B64.charCodeAt(i)] = i;

/** base64 little-endian int16 PCM -> float samples in [-1, 1]. */
export function decodePcm16(b64: string): Float32Array {
  const clean = b64.replace(/=+$/, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64_INDEX[clean.charCodeAt(i)];
    const b = B64_INDEX[clean.charCodeAt(i + 1)];
    const c = B64_INDEX[clean.charCodeAt(i + 2)];
    const d = B64_INDEX[clean.charCodeAt(i + 3)];
    bytes[p++] = (a << 2) | (b >> 4);
    if (i + 2 < clean.length) bytes[p++] = ((b & 15) << 4) | (c >> 2);
    if (i + 3 < clean.length) bytes[p++] = ((c & 3) << 6) | d;
  }
  const view = new DataView(bytes.buffer);
  const out = new Float32Array(Math.floor(p / 2));
  for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, true) / 32768;
  return out;
}
