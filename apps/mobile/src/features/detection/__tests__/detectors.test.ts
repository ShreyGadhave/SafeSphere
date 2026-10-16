import { distressFromScores, KOfN } from '../audioDetector';
import { MotionWindow } from '../motionDetector';

// Hoisted above the imports by Jest.
jest.mock('react-native-fast-tflite', () => ({ loadTensorflowModel: jest.fn() }));
jest.mock('expo-sensors', () => ({ Accelerometer: {}, Gyroscope: {} }));

describe('KOfN', () => {
  it('fires on 2 hits within 3 windows, then cools down', () => {
    const v = new KOfN(2, 3);
    expect([true, false, true].map((h) => v.push(h))).toEqual([false, false, true]);
    // Cooldown of N windows swallows immediate repeats.
    expect([true, true, true].map((h) => v.push(h))).toEqual([false, false, false]);
    expect([true, true].map((h) => v.push(h))).toEqual([false, true]);
  });

  it('ignores isolated hits', () => {
    const v = new KOfN(2, 3);
    expect([true, false, false, true, false, false].some((h) => v.push(h))).toBe(false);
  });
});

describe('distressFromScores', () => {
  const scores = (set: Record<number, number>) => {
    const s = new Float32Array(521);
    for (const [i, v] of Object.entries(set)) s[Number(i)] = v;
    return s;
  };

  it('takes the strongest of Screaming / Shout / Yell', () => {
    expect(distressFromScores(scores({ 11: 0.8, 6: 0.4 }))).toEqual({ score: expect.closeTo(0.8, 5), className: 'Screaming' });
  });

  it('ignores crying (calibrated weight 0)', () => {
    expect(distressFromScores(scores({ 19: 0.99 })).score).toBe(0);
  });
});

describe('MotionWindow', () => {
  it('returns samples oldest-first after wrapping', () => {
    const w = new MotionWindow(3);
    [1, 2, 3, 4].forEach((v) => w.push(v, v * 10));
    expect(Array.from(w.toArray())).toEqual([2, 20, 3, 30, 4, 40]);
    expect(w.peakAcc()).toBe(4);
    expect(w.count).toBe(3);
  });
});
