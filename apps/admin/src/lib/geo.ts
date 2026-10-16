import type { LngLat } from '@/types'

/**
 * PostgREST (and Supabase Realtime) return PostGIS geography columns as hex EWKB, e.g.
 * "0101000020E6100000<x:float64><y:float64>". This decodes Point values; anything else → null.
 * Also accepts GeoJSON points in case a column is ever cast to GeoJSON.
 */
export function parsePoint(value: unknown): LngLat | null {
  if (value == null) return null
  if (typeof value === 'object') {
    const geo = value as { type?: string; coordinates?: unknown }
    if (geo.type === 'Point' && Array.isArray(geo.coordinates) && geo.coordinates.length >= 2) {
      const [lng, lat] = geo.coordinates as number[]
      return Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat } : null
    }
    return null
  }
  if (typeof value !== 'string' || value.length < 42 || !/^[0-9a-fA-F]+$/.test(value)) return null

  const bytes = new Uint8Array(value.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16)
  const view = new DataView(bytes.buffer)
  const littleEndian = view.getUint8(0) === 1
  const type = view.getUint32(1, littleEndian)
  const hasSrid = (type & 0x20000000) !== 0
  if ((type & 0xff) !== 1) return null // not a Point
  const offset = hasSrid ? 9 : 5
  if (bytes.length < offset + 16) return null
  const lng = view.getFloat64(offset, littleEndian)
  const lat = view.getFloat64(offset + 8, littleEndian)
  return Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat } : null
}

/** Plain Google Maps link — a URL only, no API key involved. */
export function googleMapsUrl(point: LngLat): string {
  return `https://maps.google.com/?q=${point.lat.toFixed(6)},${point.lng.toFixed(6)}`
}

export function formatCoords(point: LngLat): string {
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`
}
