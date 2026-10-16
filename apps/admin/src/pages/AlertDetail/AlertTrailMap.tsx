import { useMemo } from 'react'
import { BaseMap } from '@/components/map/BaseMap'
import type { TrailPoint } from '@/lib/queries'
import type { LngLat, MapMarker } from '@/types'

/** Live trail: a red line through every reported position, with a pulsing dot on the latest. */
export function AlertTrailMap({ trail, fallback, active }: { trail: TrailPoint[]; fallback: LngLat | null; active: boolean }) {
  const latest = trail.at(-1) ?? fallback
  const markers = useMemo<MapMarker[]>(
    () => (latest ? [{ id: 'latest', position: latest, tone: active ? 'danger' : 'neutral', label: 'Latest position', pulse: active }] : []),
    [latest, active],
  )
  const lines = useMemo(() => [{ id: 'trail', coordinates: trail, color: '#D92D3A' }], [trail])
  const fitTo = trail.length > 0 ? trail : latest ? [latest] : []

  return (
    <BaseMap
      label="Map of this alert's location trail"
      markers={markers}
      lines={lines}
      fitTo={fitTo}
      // Fit once when the first position arrives; afterwards the viewer controls the camera.
      fitKey={fitTo.length > 0 ? 'has-points' : 'empty'}
    />
  )
}
