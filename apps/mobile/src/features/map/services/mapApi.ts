import * as Location from 'expo-location';

import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

/** [west, south, east, north] — MapLibre's bounds order. */
export type Bounds = [number, number, number, number];
export type LatLng = { lat: number; lng: number };
export type DayType = 'weekday' | 'weekend';
export type TimeSlot = { hour: number; dayType: DayType };
export type RiskLevel = 'low' | 'medium' | 'high';
export type Reason = { feature?: string; label: string; impact: number };
export type RiskCell = { h3: string; score: number; lat: number; lng: number; reasons: Reason[] };
export type SafePlace = {
  id: string;
  kind: 'police' | 'hospital' | 'pharmacy' | 'fuel' | 'metro' | 'other';
  name: string | null;
  phone: string | null;
  distanceM: number;
  lat: number;
  lng: number;
};
export type PlannedRoute = {
  label: 'fastest' | 'balanced' | 'safest' | 'custom';
  polyline: LatLng[];
  duration_s: number;
  distance_m: number;
  risk_exposure: number;
};
export type PlaceResult = { name: string; detail: string; lat: number; lng: number };

/** The phone's local time decides the slot; the app is used in India (IST). */
export function slotFor(date = new Date(), hourOverride?: number): TimeSlot {
  const day = date.getDay();
  return { hour: hourOverride ?? date.getHours(), dayType: day === 0 || day === 6 ? 'weekend' : 'weekday' };
}

export function riskLevel(score: number): RiskLevel {
  return score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low';
}

function asReasons(value: unknown): Reason[] {
  return Array.isArray(value) ? (value as Reason[]) : [];
}

export async function fetchRiskCells(bounds: Bounds, slot: TimeSlot): Promise<RiskCell[]> {
  const [west, south, east, north] = bounds;
  const args = {
    p_min_lng: west,
    p_min_lat: south,
    p_max_lng: east,
    p_max_lat: north,
    p_hour: slot.hour,
    p_day_type: slot.dayType,
  };
  // PostgREST caps responses at 1,000 rows; a zoomed-out city view has more cells than that.
  const data = [];
  for (let from = 0; from < 10_000; from += 1000) {
    const page = await supabase.rpc('risk_cells_in_bbox', args).range(from, from + 999);
    if (page.error) throw page.error;
    data.push(...page.data);
    if (page.data.length < 1000) break;
  }
  return data.map((r) => ({ h3: r.h3_index, score: r.score, lat: r.lat, lng: r.lng, reasons: asReasons(r.reasons) }));
}

function distanceM(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.sqrt(x * x + y * y) * 6_371_000;
}

/** Risk of the street cell containing (or nearest to) a point. Null outside covered cities. */
export async function areaRisk(point: LatLng, slot: TimeSlot): Promise<RiskCell | null> {
  const d = 0.008; // ~0.9 km box: always contains the point's res-8 cell centroid
  const cells = await fetchRiskCells([point.lng - d, point.lat - d, point.lng + d, point.lat + d], slot);
  let best: RiskCell | null = null;
  let bestD = Infinity;
  for (const c of cells) {
    const dist = distanceM(point, c);
    if (dist < bestD) [best, bestD] = [c, dist];
  }
  return bestD <= 700 ? best : null;
}

export async function fetchSafePlaces(point: LatLng, limit = 25): Promise<SafePlace[]> {
  const { data, error } = await supabase.rpc('nearest_safe_places', {
    p_lat: point.lat,
    p_lng: point.lng,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    kind: p.kind,
    name: p.name,
    phone: p.phone,
    distanceM: p.distance_m,
    lat: p.lat,
    lng: p.lng,
  }));
}

/** Fastest / balanced / safest routes from the ML API (ML-2). Throws a readable error when offline. */
export async function planRoutes(origin: LatLng, destination: LatLng, mode: 'walk' | 'drive'): Promise<PlannedRoute[]> {
  if (!env.mlApiUrl) throw new Error('Route planning needs the SafeSphere ML service (EXPO_PUBLIC_ML_API_URL).');
  const res = await fetch(`${env.mlApiUrl}/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination, mode }),
  }).catch(() => {
    throw new Error('Could not reach the route service. Check your connection and try again.');
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'Route planning failed.');
  return body.routes as PlannedRoute[];
}

/** Free place search (Photon, OpenStreetMap data), biased towards the user's location. */
export async function searchPlaces(query: string, near: LatLng | null): Promise<PlaceResult[]> {
  const params = new URLSearchParams({ q: query, limit: '6', lang: 'en' });
  if (near) {
    params.set('lat', String(near.lat));
    params.set('lon', String(near.lng));
  }
  const res = await fetch(`https://photon.komoot.io/api/?${params}`, {
    headers: { 'User-Agent': 'SafeSphere/1.0 (college project)' },
  });
  if (!res.ok) throw new Error('Place search is unavailable right now.');
  const json = (await res.json()) as {
    features: { geometry: { coordinates: [number, number] }; properties: Record<string, string | undefined> }[];
  };
  return json.features.map(({ geometry, properties: p }) => ({
    name: p.name ?? p.street ?? 'Unnamed place',
    detail: [p.street, p.district ?? p.locality, p.city].filter(Boolean).join(', '),
    lat: geometry.coordinates[1],
    lng: geometry.coordinates[0],
  }));
}

/** Street / area name for a point, using the phone's own geocoder (free, no key). */
export async function placeName(point: LatLng): Promise<string> {
  try {
    const [a] = await Location.reverseGeocodeAsync({ latitude: point.lat, longitude: point.lng });
    if (!a) return 'This area';
    return [a.street ?? a.name, a.district ?? a.subregion].filter(Boolean).join(', ') || a.city || 'This area';
  } catch {
    return 'This area';
  }
}
