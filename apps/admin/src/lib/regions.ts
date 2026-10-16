import type { City, LngLat, Region } from '@/types'

export const regions: { id: Region; label: string; cities: City[]; center: LngLat; zoom: number }[] = [
  {
    id: 'mumbai_region',
    label: 'Mumbai + Navi Mumbai',
    cities: ['mumbai', 'navi_mumbai'],
    center: { lng: 72.9, lat: 19.1 },
    zoom: 10.4,
  },
  { id: 'delhi', label: 'Delhi', cities: ['delhi'], center: { lng: 77.209, lat: 28.6139 }, zoom: 10.2 },
  { id: 'pune', label: 'Pune', cities: ['pune'], center: { lng: 73.8567, lat: 18.5204 }, zoom: 11 },
]

export function regionById(id: Region) {
  return regions.find((r) => r.id === id) ?? regions[0]
}

/**
 * PostgREST `or` filter for a region. Rows without a city (e.g. an SOS raised before the
 * phone resolved its city) show under every region so nothing is ever hidden.
 */
export function regionFilter(region: Region): string {
  return `city.in.(${regionById(region).cities.join(',')}),city.is.null`
}
