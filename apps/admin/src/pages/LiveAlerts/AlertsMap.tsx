import { useMemo } from 'react'
import { BaseMap } from '@/components/map/BaseMap'
import { alertTone } from '@/lib/alertPresentation'
import { triggerLabel } from '@/lib/format'
import { regionById } from '@/lib/regions'
import type { LiveAlert, MapMarker, Region } from '@/types'

const legend = [
  { label: 'SOS', color: 'bg-danger' },
  { label: 'Trip check-in', color: 'bg-warning' },
  { label: 'Guardian', color: 'bg-info' },
]

type AlertsMapProps = { alerts: LiveAlert[]; guardians: MapMarker[]; region: Region }

export function AlertsMap({ alerts, guardians, region }: AlertsMapProps) {
  const { center, zoom } = regionById(region)
  const markers = useMemo<MapMarker[]>(
    () => [
      ...alerts.flatMap((alert): MapMarker[] =>
        alert.position
          ? [
              {
                id: alert.id,
                position: alert.position,
                tone: alertTone(alert),
                label: `${triggerLabel[alert.trigger_source]}, ${alert.person?.full_name ?? 'unknown user'}`,
                pulse: true,
              },
            ]
          : [],
      ),
      ...guardians,
    ],
    [alerts, guardians],
  )

  return (
    <section
      aria-label="Alerts map"
      className="relative min-h-[420px] min-w-0 flex-[1.3_1_460px] overflow-hidden rounded-panel bg-[#eceee9]"
    >
      <BaseMap label="Map of active alerts and available guardians" center={center} zoom={zoom} markers={markers} />
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
