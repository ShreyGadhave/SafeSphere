import type { LatLng } from './anomaly';

/** One candidate route between origin and destination. */
export type ExpectedRoute = { polyline: LatLng[]; durationS: number; distanceM: number };

// Free public OSRM servers (OpenStreetMap data, no key). The foot profile runs on FOSSGIS'.
const OSRM = {
  drive: 'https://router.project-osrm.org/route/v1/driving',
  walk: 'https://routing.openstreetmap.de/routed-foot/route/v1/driving',
} as const;

/**
 * Expected routes for monitoring, with alternatives: cab drivers legitimately take different
 * roads, so "off route" means off *every* reasonable route, not just the fastest one.
 * Returns [] when routing is unreachable — the trip is still monitored for stops, heading away
 * and lateness, and the server still watches for silence.
 */
export async function expectedRoutes(origin: LatLng, destination: LatLng, mode: 'walk' | 'drive'): Promise<ExpectedRoute[]> {
  const url =
    `${OSRM[mode]}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
    '?alternatives=3&overview=full&geometries=geojson';
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'SafeSphere/1.0 (college project)' } });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      routes?: { geometry: { coordinates: [number, number][] }; duration: number; distance: number }[];
    };
    return (json.routes ?? []).map((r) => ({
      polyline: r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
      durationS: r.duration,
      distanceM: r.distance,
    }));
  } catch {
    return [];
  }
}
