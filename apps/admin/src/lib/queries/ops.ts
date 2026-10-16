import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parsePoint } from '@/lib/geo'
import { regionById, regionFilter } from '@/lib/regions'
import { getSupabase } from '@/lib/supabase'
import type { LngLat, Region } from '@/types'

// ───────────────────────────── Safe Ride trips ─────────────────────────────

const TRIP_SELECT = '*, person:profiles!trips_user_id_fkey(full_name, phone)' as const

export function useActiveTrips(region: Region) {
  return useQuery({
    queryKey: ['trips', 'active', region],
    refetchInterval: 30_000,
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('trips')
        .select(TRIP_SELECT)
        .in('status', ['active', 'escalated'])
        .or(regionFilter(region))
        .order('started_at', { ascending: false })
        .limit(100)
      if (error) throw error
      const ids = data.map((t) => t.id)
      const [points, anomalies] = await Promise.all([
        ids.length
          ? supabase.from('trip_points').select('trip_id, location, recorded_at').in('trip_id', ids).order('recorded_at', { ascending: false }).limit(1000)
          : Promise.resolve({ data: [], error: null }),
        ids.length
          ? supabase.from('trip_anomalies').select('trip_id, kind, user_response, created_at').in('trip_id', ids)
          : Promise.resolve({ data: [], error: null }),
      ])
      const latest = new Map<string, LngLat>()
      for (const p of points.data ?? []) {
        if (!latest.has(p.trip_id)) {
          const pos = parsePoint(p.location)
          if (pos) latest.set(p.trip_id, pos)
        }
      }
      return data.map((t) => ({
        ...t,
        position: latest.get(t.id) ?? null,
        destinationPoint: parsePoint(t.destination),
        anomalies: (anomalies.data ?? []).filter((a) => a.trip_id === t.id),
      }))
    },
  })
}

export function useTripTrail(tripId: string | null) {
  return useQuery({
    queryKey: ['trips', 'trail', tripId],
    enabled: !!tripId,
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('trip_points')
        .select('location, recorded_at')
        .eq('trip_id', tripId!)
        .order('recorded_at', { ascending: true })
        .limit(2000)
      if (error) throw error
      return data.map((p) => parsePoint(p.location)).filter((p): p is LngLat => p != null)
    },
  })
}

// ─────────────────────────── Risk map & zones ───────────────────────────

export function useRiskHeat(region: Region, hour: number, dayType: 'weekday' | 'weekend') {
  return useQuery({
    queryKey: ['risk', region, hour, dayType],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const c = regionById(region).center
      const args = {
        p_min_lng: c.lng - 0.5,
        p_min_lat: c.lat - 0.4,
        p_max_lng: c.lng + 0.5,
        p_max_lat: c.lat + 0.4,
        p_hour: hour,
        p_day_type: dayType,
      }
      // PostgREST returns at most 1,000 rows per request; a city has ~1,500-3,000 cells per hour.
      const rows = []
      for (let from = 0; ; from += 1000) {
        const { data, error } = await getSupabase().rpc('risk_cells_in_bbox', args).range(from, from + 999)
        if (error) throw error
        rows.push(...data)
        if (data.length < 1000) break
      }
      return rows
    },
  })
}

export function useZones(region: Region) {
  return useQuery({
    queryKey: ['zones', region],
    queryFn: async () => {
      const { data, error } = await getSupabase().from('zones').select('*').or(regionFilter(region)).order('created_at', { ascending: false })
      if (error) throw error
      return data.map((z) => ({ ...z, ring: parsePolygon(z.area) }))
    },
  })
}

/** EWKB hex polygon (what PostgREST returns for geography) -> outer ring. */
function parsePolygon(value: unknown): LngLat[] {
  if (typeof value !== 'string' || value.length < 18) return []
  const bytes = new Uint8Array(value.match(/../g)!.map((h) => parseInt(h, 16)))
  const view = new DataView(bytes.buffer)
  const le = bytes[0] === 1
  const type = view.getUint32(1, le)
  let offset = 5 + (type & 0x20000000 ? 4 : 0) // skip SRID when present
  offset += 4 // number of rings (we read the first)
  const n = view.getUint32(offset, le)
  offset += 4
  const ring: LngLat[] = []
  for (let i = 0; i < n; i++, offset += 16) ring.push({ lng: view.getFloat64(offset, le), lat: view.getFloat64(offset + 8, le) })
  return ring
}

/** Circle approximated by a 32-point polygon (zones are drawn as circles around a clicked point). */
export function circleRing(center: LngLat, radiusM: number): LngLat[] {
  const ring: LngLat[] = []
  const dLat = radiusM / 111_320
  const dLng = radiusM / (111_320 * Math.cos((center.lat * Math.PI) / 180))
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * 2 * Math.PI
    ring.push({ lng: center.lng + dLng * Math.cos(a), lat: center.lat + dLat * Math.sin(a) })
  }
  return ring
}

export function useCreateZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (z: { name: string; kind: 'safe' | 'unsafe' | 'watch'; city: string; ring: LngLat[]; nightOnly: boolean; note: string }) => {
      const wkt = `SRID=4326;POLYGON((${z.ring.map((p) => `${p.lng} ${p.lat}`).join(', ')}))`
      const { error } = await getSupabase()
        .from('zones')
        .insert({ name: z.name, kind: z.kind, city: z.city as never, area: wkt, night_only: z.nightOnly, note: z.note || null })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['zones'] }),
  })
}

export function useUpdateZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; active?: boolean; remove?: boolean }) => {
      const zones = getSupabase().from('zones')
      const { error } = patch.remove ? await zones.delete().eq('id', id) : await zones.update({ active: patch.active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['zones'] }),
  })
}

// ───────────────────────────── Guardians ─────────────────────────────

export function useGuardians() {
  return useQuery({
    queryKey: ['guardians', 'all'],
    queryFn: async () => {
      const supabase = getSupabase()
      const [people, responses] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, phone, city, guardian_status, guardian_available, last_location_at, created_at')
          .neq('guardian_status', 'none')
          .order('updated_at', { ascending: false }),
        supabase.from('guardian_responses').select('guardian_id, status'),
      ])
      if (people.error) throw people.error
      const stats = new Map<string, { notified: number; responded: number }>()
      for (const r of responses.data ?? []) {
        const s = stats.get(r.guardian_id) ?? { notified: 0, responded: 0 }
        s.notified += 1
        if (r.status === 'accepted' || r.status === 'arrived') s.responded += 1
        stats.set(r.guardian_id, s)
      }
      return people.data.map((p) => ({ ...p, stats: stats.get(p.id) ?? { notified: 0, responded: 0 } }))
    },
  })
}

export function useSetGuardianStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'verified' | 'revoked' | 'none' }) => {
      const { error } = await getSupabase()
        .from('profiles')
        .update({ guardian_status: status, ...(status !== 'verified' ? { guardian_available: false } : {}) })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['guardians'] }),
  })
}
