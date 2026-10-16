import { useMemo } from 'react'
import { BaseMap } from '@/components/map/BaseMap'
import type { LngLat, MapMarker } from '@/types'

type ShareMapProps = {
  latest: LngLat | null
  trail?: LngLat[]
  destination?: LngLat | null
  live: boolean
  label: string
}

/** Map for share pages: trail line, pulsing latest point, optional destination pin. */
export function ShareMap({ latest, trail = [], destination, live, label }: ShareMapProps) {
  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = []
    if (destination) list.push({ id: 'destination', position: destination, tone: 'neutral', label: 'Destination' })
    if (latest) {
      list.push({ id: 'latest', position: latest, tone: live ? 'danger' : 'neutral', label: 'Latest position', pulse: live })
    }
    return list
  }, [latest, destination, live])
  const lines = useMemo(() => [{ id: 'trail', coordinates: trail, color: '#D92D3A' }], [trail])
  const fitTo = [...trail, ...(latest ? [latest] : []), ...(destination ? [destination] : [])]

  return (
    <BaseMap
      label={label}
      markers={markers}
      lines={lines}
      fitTo={fitTo}
      fitKey={fitTo.length > 0 ? 'has-points' : 'empty'}
    />
  )
}
