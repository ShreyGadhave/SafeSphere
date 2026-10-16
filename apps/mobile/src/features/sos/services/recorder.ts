/**
 * B8 audio evidence: records the SOS in 30-second chunks (max 10 minutes). Each chunk is moved
 * into the app's documents folder (kept for the evidence vault), hashed with SHA-256 so it can
 * later be shown to be unaltered, then uploaded and registered through the outbox — so chunks
 * recorded while offline, or before the alert row reached the server, are delivered in order.
 */

import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  type AudioRecorder,
  type RecordingOptions,
} from 'expo-audio';
import { createRecordingOptions } from 'expo-audio/build/utils/options';
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import { EVIDENCE_BUCKET, SOS_TIMING } from '../constants';
import { write } from './outbox';

// Speech-quality mono AAC: ~180 KB per 30 s chunk, small enough to upload on a weak connection.
const OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: '.m4a',
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 48000,
  android: { ...RecordingPresets.HIGH_QUALITY.android, extension: '.m4a', outputFormat: 'mpeg4', audioEncoder: 'aac' },
};

export type ChunkInfo = { index: number; durationS: number; sizeBytes: number; sha256: string; localUri: string };

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function evidenceDir(alertId: string): Directory {
  return new Directory(Paths.document, 'evidence', alertId);
}

export class EvidenceRecorder {
  private recorder: AudioRecorder | null = null;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private index = 0;
  private recordedS = 0;

  constructor(
    private readonly alertId: string,
    private readonly userId: string,
    private readonly onChunk: (chunk: ChunkInfo) => void,
    private readonly onError: (message: string) => void,
  ) {}

  get isRunning() {
    return this.running;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        allowsBackgroundRecording: true,
        shouldPlayInBackground: true,
        interruptionMode: 'mixWithOthers',
      });
      evidenceDir(this.alertId).create({ intermediates: true, idempotent: true });
      // expo-audio's own useAudioRecorder constructs recorders this way; the lint rule misreads the default export.
      // eslint-disable-next-line import/namespace
      this.recorder = new AudioModule.AudioRecorder(createRecordingOptions(OPTIONS));
      await this.recordNextChunk();
    } catch (e) {
      this.running = false;
      this.onError(e instanceof Error ? e.message : String(e));
    }
  }

  private async recordNextChunk(): Promise<void> {
    if (!this.running || !this.recorder) return;
    if (this.recordedS >= SOS_TIMING.audioMaxS) {
      await this.stop();
      return;
    }
    const chunkS = Math.min(SOS_TIMING.audioChunkS, SOS_TIMING.audioMaxS - this.recordedS);
    await this.recorder.prepareToRecordAsync();
    const startedAt = new Date();
    this.recorder.record();
    this.timer = setTimeout(() => {
      void this.finishChunk(startedAt, chunkS).then(() => this.recordNextChunk());
    }, chunkS * 1000);
  }

  private async finishChunk(startedAt: Date, plannedS: number): Promise<void> {
    if (!this.recorder) return;
    const durationS = this.recorder.currentTime || plannedS;
    await this.recorder.stop();
    const uri = this.recorder.uri;
    if (!uri) return;
    const index = this.index++;
    this.recordedS += durationS;
    try {
      await this.persistChunk(uri, index, durationS, startedAt);
    } catch (e) {
      this.onError(`chunk ${index}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async persistChunk(uri: string, index: number, durationS: number, startedAt: Date): Promise<void> {
    const file = new File(uri);
    const target = new File(evidenceDir(this.alertId), `${index}.m4a`);
    await file.move(target);
    const bytes = await target.bytes();
    const sha256 = toHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes));
    const storagePath = `${this.userId}/${this.alertId}/${index}.m4a`;

    await write({
      kind: 'upload',
      bucket: EVIDENCE_BUCKET,
      path: storagePath,
      fileUri: target.uri,
      contentType: 'audio/mp4',
    });
    await write({
      kind: 'insert',
      table: 'evidence',
      row: {
        alert_id: this.alertId,
        user_id: this.userId,
        kind: 'audio',
        storage_path: storagePath,
        sha256,
        chunk_index: index,
        duration_s: Math.round(durationS * 10) / 10,
        size_bytes: bytes.byteLength,
        recorded_at: startedAt.toISOString(),
      },
    });
    await write({
      kind: 'insert',
      table: 'alert_events',
      row: { alert_id: this.alertId, kind: 'recording_uploaded', payload: { chunk_index: index, sha256 } },
    });
    this.onChunk({ index, durationS, sizeBytes: bytes.byteLength, sha256, localUri: target.uri });
  }

  /** Stops after saving whatever was recorded in the current chunk. */
  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const recorder = this.recorder;
    if (recorder?.isRecording) {
      const partial = recorder.currentTime;
      await this.finishChunk(new Date(Date.now() - partial * 1000), partial).catch(() => undefined);
    }
    recorder?.release();
    this.recorder = null;
    await setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false }).catch(() => undefined);
  }
}
