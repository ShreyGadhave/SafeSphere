import { useMemo } from 'react'
import { BaseMap } from '@/components/map/BaseMap'
import type { MapMarker, PriorityAlert } from '@/types'

const legend = [
  { label: 'High', color: 'bg-danger' },
  { label: 'Ride anomaly', color: 'bg-warning' },
  { label: 'Medium', color: 'bg-ink' },
  { label: 'Guardian', color: 'bg-info' },
]

export function AlertsMap({ alerts, guardians }: { alerts: PriorityAlert[]; guardians: MapMarker[] }) {
  const markers = useMemo<MapMarker[]>(
    () => [
      ...alerts.map((alert) => ({
        id: alert.id,
        position: alert.position,
        tone: alert.tone,
        label: `${alert.title}, ${alert.place}`,
        pulse: alert.tone !== 'neutral',
      })),
      ...guardians,
    ],
    [alerts, guardians],
  )

  return (
    <section
      aria-label="Alerts map"
      className="relative min-h-[420px] min-w-0 flex-[1.3_1_460px] overflow-hidden rounded-panel bg-[#eceee9]"
    >
      <BaseMap label="Map of active alerts and guardians" center={{ lng: 72.9, lat: 19.1 }} zoom={10.6} markers={markers} />
      <div className="absolute bottom-3.5 left-3.5 flex flex-wrap gap-3 rounded-[14px] bg-card px-3 py-2.5 text-xs font-bold shadow-sm">
        {legend.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-2.5 rounded-full ${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>
    </section>
  )
}
