import { checkAnomaly, distanceToPolylineM, type TrackPoint } from '../services/anomaly';
import { looksLikeTripShare, normalizePlate, parseShareText } from '../services/parseShare';

describe('parseShareText', () => {
  it('reads an Uber-style share', () => {
    const p = parseShareText(
      "I'm on my way to Hiranandani Gardens, Powai. Follow my trip: https://t.uber.com/ab12XyZ — riding with Suresh in a White Swift Dzire MH02EK4471",
    );
    expect(p.provider).toBe('uber');
    expect(p.trackingUrl).toBe('https://t.uber.com/ab12XyZ');
    expect(p.destination).toBe('Hiranandani Gardens, Powai');
    expect(p.driverName).toBe('Suresh');
    expect(p.plate).toBe('MH 02 EK 4471');
  });

  it('reads an Ola-style share without inventing a destination', () => {
    const p = parseShareText('Track my ride with Ola: https://ola.onelink.me/xyz123 Driver: Ramesh K. Cab no. KA-05-MN-1234');
    expect(p.provider).toBe('ola');
    expect(p.driverName).toBe('Ramesh K');
    expect(p.plate).toBe('KA 05 MN 1234');
    expect(p.destination).toBeNull();
  });

  it('leaves everything null for unrelated text', () => {
    const p = parseShareText('See you at dinner tonight!');
    expect(p).toEqual({ provider: null, trackingUrl: null, driverName: null, plate: null, vehicle: null, destination: null });
    expect(looksLikeTripShare('See you at dinner tonight!')).toBe(false);
  });

  it('does not read plates out of tracking URLs', () => {
    expect(parseShareText('Follow along https://t.uber.com/MH02EK4471abc').plate).toBeNull();
  });

  it('normalizes plates', () => {
    expect(normalizePlate('DL 3C AB 1234')).toBe('DL 03 CAB 1234');
    expect(normalizePlate('MH 12 AB 1')).toBeNull();
  });
});

// A straight east-west road in Mumbai; 0.001° longitude ≈ 105 m here.
const ROUTE = [
  { lat: 19.0, lng: 72.8 },
  { lat: 19.0, lng: 72.85 },
];
const DEST = { lat: 19.0, lng: 72.85 };
const ctx = { routes: [ROUTE], destination: DEST, startedAt: 0, expectedArrivalAt: null, plannedDurationS: null };

function track(points: [number, number][], stepS = 5): TrackPoint[] {
  return points.map(([lat, lng], i) => ({ lat, lng, t: i * stepS * 1000 }));
}

describe('distanceToPolylineM', () => {
  it('is ~0 on the line and ~111 m per 0.001° of latitude off it', () => {
    expect(distanceToPolylineM({ lat: 19.0, lng: 72.82 }, ROUTE)).toBeLessThan(1);
    expect(distanceToPolylineM({ lat: 19.001, lng: 72.82 }, ROUTE)).toBeCloseTo(111, -1);
  });
});

describe('checkAnomaly', () => {
  it('stays quiet on a normal drive along the route', () => {
    const t = track(Array.from({ length: 30 }, (_, i) => [19.0, 72.8 + i * 0.001] as [number, number]));
    expect(checkAnomaly(t, ctx, t[t.length - 1].t)).toBeNull();
  });

  it('flags leaving the route while moving away from the destination', () => {
    const t = track(Array.from({ length: 10 }, (_, i) => [19.003 + i * 0.0005, 72.82 - i * 0.0005] as [number, number]));
    expect(checkAnomaly(t, ctx, t[t.length - 1].t)?.kind).toBe('off_route');
  });

  it('flags a 4-minute stop away from the destination', () => {
    const t = track(Array.from({ length: 50 }, () => [19.0, 72.82] as [number, number]));
    expect(checkAnomaly(t, ctx, t[t.length - 1].t)?.kind).toBe('unexpected_stop');
  });

  it('does not flag a stop at the destination', () => {
    const t = track(Array.from({ length: 50 }, () => [19.0, 72.8499] as [number, number]));
    expect(checkAnomaly(t, ctx, t[t.length - 1].t)).toBeNull();
  });

  it('flags an overdue trip', () => {
    const t = track([[19.0, 72.82]]);
    const late = { ...ctx, expectedArrivalAt: 0, plannedDurationS: 600 };
    expect(checkAnomaly(t, late, 11 * 60 * 1000)?.kind).toBe('overdue');
  });
});
