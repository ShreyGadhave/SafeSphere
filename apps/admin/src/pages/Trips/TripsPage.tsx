import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Car } from 'lucide-react'
import { BaseMap } from '@/components/map/BaseMap'
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui'
import { errorMessage } from '@/lib/errors'
import { timeAgo } from '@/lib/format'
import { fadeUp, stagger } from '@/lib/motion'
import { useActiveTrips, usePlannedRoute, useTripTrail } from '@/lib/queries'
import { regionById, regions } from '@/lib/regions'
import { useNow } from '@/lib/useNow'
import type { LngLat, MapLine, MapMarker, Region } from '@/types'

const ISSUE: Record<string, string> = {
  off_route: 'Left route',
  unexpected_stop: 'Long stop',
  heading_away: 'Heading away',
  overdue: 'Overdue',
  gps_silent: 'Phone silent',
}

/** H2 trips view: every Safe Ride / Safe Walk being monitored, with its anomaly history (ML-5). */
export function TripsPage() {
  const [region, setRegion] = useState<Region>(regions[0].id)
  const [selected, setSelected] = useState<string | null>(null)
  const now = useNow(30_000)
  const trips = useActiveTrips(region)
  const trail = useTripTrail(selected)
  const r = regionById(region)
  const current = trips.data?.find((t) => t.id === selected)
  const planned = usePlannedRoute(current)

  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = []
    for (const t of trips.data ?? []) {
      const silentMin = t.last_heartbeat_at ? (now - new Date(t.last_heartbeat_at).getTime()) / 60_000 : 99
      if (t.position)
        list.push({
          id: t.id,
          position: t.position,
          tone: t.status === 'escalated' ? 'danger' : silentMin > 3 || t.anomalies.length ? 'warning' : 'info',
          label: `${t.person?.full_name ?? 'User'} · ${t.mode}`,
          pulse: t.id === selected,
        })
    }
    if (current?.originPoint) list.push({ id: 'start', position: current.originPoint, tone: 'safe', label: 'Start' })
    if (current?.destinationPoint)
      list.push({ id: 'dest', position: current.destinationPoint, tone: 'neutral', label: `Destination: ${current.destination_name ?? ''}` })
    return list
  }, [trips.data, now, selected, current])

  // Planned route (grey) under the travelled trail (blue).
  const lines = useMemo<MapLine[]>(() => {
    if (!selected) return []
    const list: MapLine[] = []
    if (planned.data) list.push({ id: `${selected}-planned`, coordinates: planned.data, color: '#8A93A0' })
    if (trail.data?.length) list.push({ id: selected, coordinates: trail.data, color: '#2563EB' })
    return list
  }, [selected, planned.data, trail.data])

  // Fit start, destination, route and trail when a trip is picked.
  const fitPoints = useMemo<LngLat[] | undefined>(() => {
    if (!current) return undefined
    const pts = [current.originPoint, current.destinationPoint, current.position].filter((p): p is LngLat => p != null)
    return [...pts, ...(planned.data ?? []), ...(trail.data ?? [])]
  }, [current, planned.data, trail.data])

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Safe Ride trips"
        subtitle="Every ride and walk being monitored right now"
        actions={
          <div className="flex flex-wrap gap-2">
            {regions.map((x) => (
              <Button key={x.id} size="sm" variant={x.id === region ? 'primary' : 'secondary'} onClick={() => setRegion(x.id)}>
                {x.label}
              </Button>
            ))}
          </div>
        }
      />
      <div className="flex flex-wrap items-stretch gap-4">
        <Card variant="panel" className="flex min-w-0 flex-[1_1_380px] flex-col gap-3">
          <h2 className="m-0 text-[17px] font-extrabold">Active trips</h2>
          {trips.isError ? (
            <ErrorState message={errorMessage(trips.error)} onRetry={() => void trips.refetch()} />
          ) : trips.isPending ? (
            <Skeleton className="h-40" />
          ) : trips.data.length === 0 ? (
            <EmptyState icon={Car} tone="safe" title="No trips being monitored" description="Safe Rides and Safe Walks appear here as soon as they start." />
          ) : (
            <motion.ul variants={stagger} initial="hidden" animate="show" className="m-0 flex list-none flex-col gap-2 p-0">
              {trips.data.map((t) => {
                const silent = t.last_heartbeat_at ? now - new Date(t.last_heartbeat_at).getTime() > 3 * 60_000 : true
                return (
                  <motion.li key={t.id} variants={fadeUp}>
                    <button
                      type="button"
                      onClick={() => setSelected(t.id === selected ? null : t.id)}
                      aria-pressed={t.id === selected}
                      className={`flex w-full flex-col gap-1.5 rounded-tile border p-3 text-left ${t.id === selected ? 'border-ink bg-card' : 'border-hairline bg-card hover:border-ink-3'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold">
                          {t.person?.full_name ?? 'User'} · {t.mode === 'ride' ? 'Ride' : 'Walk'}
                        </span>
                        <span className="text-xs text-ink-3">started {timeAgo(t.started_at, now)}</span>
                      </div>
                      <span className="text-[13px] text-ink-2">
                        To {t.destination_name ?? 'destination'}
                        {t.vehicle_plate ? ` · ${t.vehicle_description ?? 'cab'} ` : ''}
                        {t.vehicle_plate && <span className="rounded border border-ink bg-[#FCD34D] px-1.5 font-extrabold text-ink">{t.vehicle_plate}</span>}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {t.status === 'escalated' && <Badge tone="solid-danger">Escalated</Badge>}
                        <Badge tone={silent ? 'warning' : 'safe'}>
                          {t.last_heartbeat_at ? `Last ping ${timeAgo(t.last_heartbeat_at, now)}` : 'No ping yet'}
                        </Badge>
                        {t.anomalies.map((a, i) => (
                          <Badge key={i} tone={a.user_response === 'ok' ? 'neutral' : 'warning'}>
                            {ISSUE[a.kind] ?? a.kind}
                            {a.user_response === 'ok' ? ' · user OK' : a.user_response === 'pending' ? '' : ` · ${a.user_response.replace('_', ' ')}`}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  </motion.li>
                )
              })}
            </motion.ul>
          )}
        </Card>
        <section aria-label="Trips map" className="relative min-h-[460px] min-w-0 flex-[1.3_1_460px] overflow-hidden rounded-panel bg-[#eceee9]">
          <BaseMap
            label="Map of monitored trips"
            center={r.center}
            zoom={r.zoom}
            markers={markers}
            lines={lines}
            fitTo={fitPoints}
            // Refit once the planned route arrives, not on every live trail update.
            fitKey={selected ? `${selected}-${planned.data ? 'route' : 'pins'}` : undefined}
          />
          {current && (
            <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 rounded-tile bg-white/95 px-3 py-2 text-xs shadow">
              <span className="font-bold">{current.destination_name ? `To ${current.destination_name}` : 'Selected trip'}</span>
              <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-[#12A26B]" aria-hidden="true" />Start</span>
              <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-[#0E1726]" aria-hidden="true" />Destination</span>
              <span className="flex items-center gap-2"><span className="h-1 w-4 rounded bg-[#8A93A0]" aria-hidden="true" />
                {planned.isFetching ? 'Planned route (loading…)' : planned.data ? 'Planned route' : 'Planned route unavailable'}
              </span>
              <span className="flex items-center gap-2"><span className="h-1 w-4 rounded bg-[#2563EB]" aria-hidden="true" />
                Travelled so far {trail.data?.length ? '' : '(no GPS yet)'}
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
