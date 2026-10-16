import { Accelerometer, Gyroscope } from 'expo-sensors';
import { loadTensorflowModel, type TfliteModel } from 'react-native-fast-tflite';

import config from '../../../assets/models/fall_config.json';

/**
 * ML-4 on-device fall detection (see ml/src/safesphere_ml/motion/train.py).
 * Samples accelerometer + gyroscope at 25 Hz, keeps a 4 s window of orientation-free magnitudes
 * [|acc| in g, |gyro| in rad/s], and runs the 1D-CNN every 0.5 s — only after an impact
 * (|acc| above the gate), so the model costs nothing while the phone is still.
 */

export type MotionDetection = { probability: number; peakG: number };

const INTERVAL_MS = 1000 / config.sample_rate_hz;
const CHECK_EVERY = Math.round(config.sample_rate_hz / 2);
const COOLDOWN_MS = 15_000;

let model: TfliteModel | null = null;

async function getModel(): Promise<TfliteModel> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro bundles assets via require()
  model ??= await loadTensorflowModel(require('../../../assets/models/fall_cnn.tflite'), []);
  return model;
}

/** Fixed-size window of [acc, gyro] pairs, oldest first when read. */
export class MotionWindow {
  private readonly data: Float32Array;
  private next = 0;
  count = 0;

  constructor(private readonly size: number) {
    this.data = new Float32Array(size * 2);
  }

  push(accG: number, gyro: number): void {
    this.data[this.next * 2] = accG;
    this.data[this.next * 2 + 1] = gyro;
    this.next = (this.next + 1) % this.size;
    this.count = Math.min(this.size, this.count + 1);
  }

  /** Chronological copy, shape [size, 2] flattened. */
  toArray(): Float32Array {
    const out = new Float32Array(this.size * 2);
    for (let i = 0; i < this.size; i++) {
      const j = ((this.next + i) % this.size) * 2;
      out[i * 2] = this.data[j];
      out[i * 2 + 1] = this.data[j + 1];
    }
    return out;
  }

  peakAcc(): number {
    let peak = 0;
    for (let i = 0; i < this.size; i++) peak = Math.max(peak, this.data[i * 2]);
    return peak;
  }
}

export class FallDetector {
  private subs: { remove(): void }[] = [];
  private window = new MotionWindow(config.window_samples);
  private gyro = 0;
  private sinceCheck = 0;
  private busy = false;
  private lastTrigger = 0;

  async start(onTrigger: (d: MotionDetection) => void): Promise<void> {
    if (this.subs.length) return;
    const m = await getModel();
    Accelerometer.setUpdateInterval(INTERVAL_MS);
    Gyroscope.setUpdateInterval(INTERVAL_MS);
    this.subs.push(Gyroscope.addListener(({ x, y, z }) => (this.gyro = Math.hypot(x, y, z))));
    this.subs.push(
      Accelerometer.addListener(({ x, y, z }) => {
        // Expo reports acceleration in g; clip like the training data (phone sensors saturate ~16 g).
        this.window.push(Math.min(Math.hypot(x, y, z), 16), this.gyro);
        if (++this.sinceCheck < CHECK_EVERY || this.window.count < config.window_samples || this.busy) return;
        this.sinceCheck = 0;
        const peakG = this.window.peakAcc();
        if (peakG < config.impact_gate_g || Date.now() - this.lastTrigger < COOLDOWN_MS) return;
        this.busy = true;
        m.run([this.window.toArray().buffer as ArrayBuffer])
          .then(([out]) => {
            const probability = new Float32Array(out)[0];
            if (probability >= config.threshold) {
              this.lastTrigger = Date.now();
              onTrigger({ probability, peakG });
            }
          })
          .catch((e) => console.warn('[fall-detector] inference failed', e))
          .finally(() => {
            this.busy = false;
          });
      }),
    );
  }

  stop(): void {
    this.subs.forEach((s) => s.remove());
    this.subs = [];
    this.window = new MotionWindow(config.window_samples);
  }
}
