import type { LngLat } from '@/types'

/** Free OpenStreetMap vector style, same "liberty" look as the mobile app — no API key, no usage limits. */
export const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

export const MUMBAI_CENTER: LngLat = { lng: 72.8777, lat: 19.076 }

/** Same bands as the app: low < 45 ≤ medium < 75 ≤ high. */
export const RISK_BANDS = [
  { label: 'Low', range: '0–44', color: '#12A26B' },
  { label: 'Medium', range: '45–74', color: '#E08A00' },
  { label: 'High', range: '75–100', color: '#D92D3A' },
] as const
