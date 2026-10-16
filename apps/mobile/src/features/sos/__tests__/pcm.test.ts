import { decodePcm16 } from '../../../../modules/safesphere-telephony';

function encode(samples: number[]): string {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  samples.forEach((s, i) => view.setInt16(i * 2, s, true));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

describe('decodePcm16', () => {
  it('decodes little-endian int16 to [-1, 1] floats', () => {
    const out = decodePcm16(encode([0, 16384, -16384, 32767, -32768]));
    expect(Array.from(out)).toEqual([0, 0.5, -0.5, 32767 / 32768, -1]);
  });

  it('handles every base64 padding length', () => {
    for (const n of [1, 2, 3, 4, 5, 7]) {
      const samples = Array.from({ length: n }, (_, i) => (i * 1234) % 30000);
      expect(decodePcm16(encode(samples))).toHaveLength(n);
    }
  });
});
