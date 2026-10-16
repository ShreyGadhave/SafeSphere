import type { LatLng } from './anomaly';

/** One candidate route between origin and destination. */
export type ExpectedRoute = { polyline: LatLng[]; durationS: number; distanceM: number };

// Free public OSRM servers (OpenStreetMap data, no key). Both are asked at once and the first
// good answer wins: either can be slow or overloaded at times.
const OSRM = {
  drive: ['https://router.project-osrm.org/route/v1/driving', 'https://routing.openstreetmap.de/routed-car/route/v1/driving'],
  walk: ['https://routing.openstreetmap.de/routed-foot/route/v1/driving'],
} as const;

type OsrmResponse = {
  routes?: { geometry: { coordinates: [number, number][] }; duration: number; distance: number }[];
};

async function fetchRoutes(base: string, path: string, signal: AbortSignal): Promise<ExpectedRoute[]> {
  const res = await fetch(`${base}/${path}`, { headers: { 'User-Agent': 'SafeSphere/1.0 (college project)' }, signal });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const json = (await res.json()) as OsrmResponse;
  const routes = (json.routes ?? []).map((r) => ({
    polyline: r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    durationS: r.duration,
    distanceM: r.distance,
  }));
  if (!routes.length) throw new Error('No route');
  return routes;
}

/**
 * Expected routes for monitoring, with alternatives: cab drivers legitimately take different
 * roads, so "off route" means off *every* reasonable route, not just the fastest one.
 * Returns [] when routing is unreachable — the trip is still monitored for stops, heading away
 * and lateness, and the server still watches for silence.
 */
export async function expectedRoutes(origin: LatLng, destination: LatLng, mode: 'walk' | 'drive'): Promise<ExpectedRoute[]> {
  const path =
    `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` + '?alternatives=3&overview=full&geometries=geojson';
  // Never let slow servers hold up a trip.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 6000);
  try {
    return await Promise.any(OSRM[mode].map((base) => fetchRoutes(base, path, abort.signal)));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
    abort.abort(); // cancel the slower request
  }
}
