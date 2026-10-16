import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { BaseMap } from '@/components/map/BaseMap'
import { Badge, Button, Card, ErrorState, PageHeader } from '@/components/ui'
import { errorMessage } from '@/lib/errors'
import { circleRing, useCreateZone, useRiskHeat, useUpdateZone, useZones } from '@/lib/queries'
import { regionById, regions } from '@/lib/regions'
import type { LngLat, MapMarker, Region } from '@/types'

const ZONE_COLOR = { safe: '#12A26B', unsafe: '#D92D3A', watch: '#E08A00' } as const
type ZoneKind = keyof typeof ZONE_COLOR

type Reason = { label: string; impact: number }

/** ML-1 risk heatmap per city and hour, cell reasons on click, and safe / unsafe zone management. */
export function RiskMapPage() {
  const [region, setRegion] = useState<Region>(regions[0].id)
  const [hour, setHour] = useState(new Date().getHours())
  const [dayType, setDayType] = useState<'weekday' | 'weekend'>([0, 6].includes(new Date().getDay()) ? 'weekend' : 'weekday')
  const [picked, setPicked] = useState<LngLat | null>(null)
  const [form, setForm] = useState({ name: '', kind: 'unsafe' as ZoneKind, radius: 300, nightOnly: true, note: '' })
  const r = regionById(region)
  const heat = useRiskHeat(region, hour, dayType)
  const zones = useZones(region)
  const createZone = useCreateZone()
  const updateZone = useUpdateZone()

  const heatPoints = useMemo(() => (heat.data ?? []).map((c) => ({ lng: c.lng, lat: c.lat, weight: c.score / 100 })), [heat.data])
  const polygons = useMemo(
    () =>
      [
        ...(zones.data ?? []).filter((z) => z.active).map((z) => ({ id: z.id, ring: z.ring, color: ZONE_COLOR[z.kind as ZoneKind] })),
        ...(picked ? [{ id: 'draft', ring: circleRing(picked, form.radius), color: ZONE_COLOR[form.kind] }] : []),
      ],
    [zones.data, picked, form.radius, form.kind],
  )
  // Nearest cell to the clicked point: its score and SHAP reasons.
  const cell = useMemo(() => {
    if (!picked || !heat.data?.length) return null
    let best = heat.data[0]
    let bestD = Infinity
    for (const c of heat.data) {
      const d = (c.lng - picked.lng) ** 2 + (c.lat - picked.lat) ** 2
      if (d < bestD) [best, bestD] = [c, d]
    }
    return Math.sqrt(bestD) < 0.008 ? best : null
  }, [picked, heat.data])
  const markers: MapMarker[] = picked ? [{ id: 'picked', position: picked, tone: 'neutral', label: 'Selected point' }] : []

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Risk map & zones"
        subtitle="Predicted incident risk by hour (ML-1). Click the map to inspect a spot or add a zone."
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
      <Card variant="panel" className="flex flex-wrap items-center gap-4">
        <label className="flex flex-1 items-center gap-3 text-sm font-semibold">
          Hour {String(hour).padStart(2, '0')}:00
          <input type="range" min={0} max={23} value={hour} onChange={(e) => setHour(Number(e.target.value))} className="flex-1 accent-[#0E1726]" aria-label="Hour of day" />
        </label>
        <div className="flex gap-2">
          {(['weekday', 'weekend'] as const).map((d) => (
            <Button key={d} size="sm" variant={d === dayType ? 'primary' : 'secondary'} onClick={() => setDayType(d)}>
              {d === 'weekday' ? 'Weekday' : 'Weekend'}
            </Button>
          ))}
        </div>
        <span className="text-xs text-ink-3">{heat.isFetching ? 'Loading cells…' : `${heat.data?.length ?? 0} street cells`}</span>
      </Card>
      {heat.isError && <ErrorState message={errorMessage(heat.error)} onRetry={() => void heat.refetch()} />}

      <div className="flex flex-wrap items-stretch gap-4">
        <section aria-label="Risk heatmap" className="relative min-h-[520px] min-w-0 flex-[1.6_1_520px] overflow-hidden rounded-panel bg-[#eceee9]">
          <BaseMap label="Risk heatmap" center={r.center} zoom={r.zoom} heat={heatPoints} polygons={polygons} markers={markers} onMapClick={setPicked} />
        </section>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <Card variant="panel" className="flex flex-col gap-2">
            <h2 className="m-0 text-[17px] font-extrabold">Selected spot</h2>
            {!picked ? (
              <p className="m-0 text-sm text-ink-3">Click the map.</p>
            ) : cell ? (
              <>
                <p className="m-0 text-sm">
                  Risk <strong className="text-lg">{Math.round(cell.score)}</strong> / 100 at {String(hour).padStart(2, '0')}:00
                </p>
                <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
                  {((cell.reasons as Reason[] | null) ?? []).map((x) => (
                    <li key={x.label} className="flex justify-between">
                      <span>{x.label}</span>
                      <span className={x.impact >= 0 ? 'font-bold text-danger-ink' : 'font-bold text-safe-ink'}>
                        {x.impact >= 0 ? `+${x.impact}` : x.impact}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="m-0 text-sm text-ink-3">No street cell here.</p>
            )}
          </Card>

          <Card variant="panel" className="flex flex-col gap-3">
            <h2 className="m-0 text-[17px] font-extrabold">Add a zone here</h2>
            <input className="rounded-tile border border-hairline px-3 py-2 text-sm" placeholder="Zone name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Zone name" />
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ZONE_COLOR) as ZoneKind[]).map((k) => (
                <Button key={k} size="sm" variant={form.kind === k ? 'primary' : 'secondary'} onClick={() => setForm({ ...form, kind: k })}>
                  {k === 'safe' ? 'Safe' : k === 'unsafe' ? 'Unsafe' : 'Watch'}
                </Button>
              ))}
            </div>
            <label className="flex items-center gap-3 text-sm">
              Radius {form.radius} m
              <input type="range" min={100} max={1500} step={50} value={form.radius} onChange={(e) => setForm({ ...form, radius: Number(e.target.value) })} className="flex-1 accent-[#0E1726]" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.nightOnly} onChange={(e) => setForm({ ...form, nightOnly: e.target.checked })} /> Night only
            </label>
            {createZone.error && <p className="m-0 text-sm text-danger-ink">{errorMessage(createZone.error)}</p>}
            <Button
              disabled={!picked || !form.name.trim() || createZone.isPending}
              onClick={() =>
                createZone.mutate(
                  { name: form.name.trim(), kind: form.kind, city: r.cities[0], ring: circleRing(picked!, form.radius), nightOnly: form.nightOnly, note: form.note },
                  { onSuccess: () => setForm({ ...form, name: '' }) },
                )
              }
            >
              {picked ? 'Save zone' : 'Click the map first'}
            </Button>
          </Card>

          <Card variant="panel" className="flex flex-col gap-2">
            <h2 className="m-0 text-[17px] font-extrabold">Zones</h2>
            {(zones.data ?? []).length === 0 && <p className="m-0 text-sm text-ink-3">No zones yet.</p>}
            {(zones.data ?? []).map((z) => (
              <div key={z.id} className="flex items-center gap-2 text-sm">
                <span className="size-2.5 rounded-full" style={{ background: ZONE_COLOR[z.kind as ZoneKind] }} aria-hidden="true" />
                <span className="flex-1 font-semibold">{z.name}</span>
                {z.night_only && <Badge tone="outline">Night</Badge>}
                <Button size="sm" variant="secondary" onClick={() => updateZone.mutate({ id: z.id, active: !z.active })}>
                  {z.active ? 'Disable' : 'Enable'}
                </Button>
                <button type="button" aria-label={`Delete ${z.name}`} className="rounded p-1 text-ink-3 hover:text-danger" onClick={() => updateZone.mutate({ id: z.id, remove: true })}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}
