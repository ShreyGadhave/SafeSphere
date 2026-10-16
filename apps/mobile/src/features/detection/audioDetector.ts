import { loadTensorflowModel, type TfliteModel } from 'react-native-fast-tflite';

import { canCaptureAudio, startAudioCapture } from '../../../modules/safesphere-telephony';
import config from '../../../assets/models/distress_config.json';

/**
 * ML-3 on-device scream detection (see ml/src/safesphere_ml/audio/evaluate_yamnet.py).
 * Streams 16 kHz microphone audio from the native module, runs YAMNet on a 0.975 s window every
 * 0.5 s, and triggers when the distress score passes the calibrated threshold in K of the last N
 * windows. Audio never leaves the phone; nothing is stored.
 */

export type AudioDetection = { score: number; className: string };

const CLASS_NAMES = Object.fromEntries(
  Object.entries({ ...config.primary_classes, ...config.secondary_classes }).map(([name, idx]) => [idx, name]),
);

export function distressFromScores(scores: Float32Array): AudioDetection {
  let best = { score: 0, className: '' };
  for (const idx of Object.values(config.primary_classes)) {
    if (scores[idx] > best.score) best = { score: scores[idx], className: CLASS_NAMES[idx] };
  }
  if (config.secondary_weight > 0) {
    for (const idx of Object.values(config.secondary_classes)) {
      const s = scores[idx] * config.secondary_weight;
      if (s > best.score) best = { score: s, className: CLASS_NAMES[idx] };
    }
  }
  return best;
}

/** K-of-N vote over recent windows; re-arms after N quiet windows. */
export class KOfN {
  private hits: boolean[] = [];
  private cooldown = 0;
  constructor(
    private readonly k: number,
    private readonly n: number,
  ) {}

  push(hit: boolean): boolean {
    if (this.cooldown > 0) {
      this.cooldown--;
      return false;
    }
    this.hits = [...this.hits, hit].slice(-this.n);
    if (this.hits.filter(Boolean).length >= this.k) {
      this.hits = [];
      this.cooldown = this.n;
      return true;
    }
    return false;
  }
}

let model: TfliteModel | null = null;

async function getModel(): Promise<TfliteModel> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro bundles assets via require()
  model ??= await loadTensorflowModel(require('../../../assets/models/yamnet.tflite'), []);
  return model;
}

export class AudioDistressDetector {
  private stopCapture: (() => Promise<void>) | null = null;
  private window = new Float32Array(config.window_samples);
  private filled = 0;
  private busy = false;
  private vote = new KOfN(config.k_of_n[0], config.k_of_n[1]);

  static isSupported(): boolean {
    return canCaptureAudio();
  }

  async start(onTrigger: (d: AudioDetection) => void): Promise<void> {
    if (this.stopCapture) return;
    const m = await getModel();
    this.stopCapture = await startAudioCapture(
      (chunk) => {
        // Slide the analysis window: keep the newest WINDOW samples.
        const keep = Math.max(0, this.window.length - chunk.length);
        this.window.copyWithin(0, this.window.length - keep);
        this.window.set(chunk.subarray(Math.max(0, chunk.length - this.window.length)), keep);
        this.filled = Math.min(this.window.length, this.filled + chunk.length);
        if (this.filled < this.window.length || this.busy) return;
        this.busy = true;
        const input = this.window.slice().buffer;
        m.run([input])
          .then(([out]) => {
            const detection = distressFromScores(new Float32Array(out));
            if (this.vote.push(detection.score >= config.threshold)) onTrigger(detection);
          })
          .catch((e) => console.warn('[audio-detector] inference failed', e))
          .finally(() => {
            this.busy = false;
          });
      },
      config.sample_rate,
      config.hop_samples,
    );
  }

  async stop(): Promise<void> {
    const stop = this.stopCapture;
    this.stopCapture = null;
    this.filled = 0;
    await stop?.();
  }
}
