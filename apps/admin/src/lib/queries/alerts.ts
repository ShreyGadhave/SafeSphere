import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/auth/authContext'
import { parsePoint } from '@/lib/geo'
import { regionFilter } from '@/lib/regions'
import { getSupabase } from '@/lib/supabase'
import type { AlertStatus, EvidenceRow, LiveAlert, LngLat, MapMarker, Region } from '@/types'
import { queryKeys } from './keys'

/** alerts has two FKs to profiles (user_id, resolved_by), so the join names the one we mean. */
const ALERT_SELECT = '*, person:profiles!alerts_user_id_fkey(full_name, phone)' as const

const DAY_MS = 24 * 60 * 60 * 1000

async function latestPositions(alertIds: string[]): Promise<Map<string, LngLat>> {
  const positions = new Map<string, LngLat>()
  if (alertIds.length === 0) return positions
  const { data, error } = await getSupabase()
    .from('alert_locations')
    .select('alert_id, location, recorded_at')
    .in('alert_id', alertIds)
    .order('recorded_at', { ascending: false })
    .limit(Math.min(1000, alertIds.length * 30))
  if (error) throw error
  for (const row of data) {
    if (positions.has(row.alert_id)) continue
    const point = parsePoint(row.location)
    if (point) positions.set(row.alert_id, point)
  }
  return positions
}

export interface LiveAlertsData {
  active: LiveAlert[]
  /** Closed in the last 24 h, newest first. */
  recent: LiveAlert[]
}

/** Active alerts (newest first) plus the last day's closed ones, for one region. */
export function useLiveAlerts(region: Region) {
  return useQuery({
    queryKey: queryKeys.liveAlerts(region),
    queryFn: async (): Promise<LiveAlertsData> => {
      const supabase = getSupabase()
      const since = new Date(Date.now() - DAY_MS).toISOString()
      const [active, recent] = await Promise.all([
        supabase
          .from('alerts')
          .select(ALERT_SELECT)
          .eq('status', 'active')
          .or(regionFilter(region))
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('alerts')
          .select(ALERT_SELECT)
          .neq('status', 'active')
          .gte('created_at', since)
          .or(regionFilter(region))
          .order('created_at', { ascending: false })
          .limit(20),
      ])
      if (active.error) throw active.error
      if (recent.error) throw recent.error
      const positions = await latestPositions(active.data.map((a) => a.id))
      const withPosition = (row: (typeof active.data)[number]): LiveAlert => ({
        ...row,
        position: positions.get(row.id) ?? parsePoint(row.location),
      })
      return { active: active.data.map(withPosition), recent: recent.data.map(withPosition) }
    },
  })
}

export function useAlert(id: string) {
  return useQuery({
    queryKey: queryKeys.alert(id),
    queryFn: async (): Promise<LiveAlert | null> => {
      const { data, error } = await getSupabase().from('alerts').select(ALERT_SELECT).eq('id', id).maybeSingle()
      if (error) throw error
      return data ? { ...data, position: parsePoint(data.location) } : null
    },
  })
}

export interface TrailPoint extends LngLat {
  at: string
  accuracy_m: number | null
  battery_pct: number | null
}

export function useAlertLocations(id: string) {
  return useQuery({
    queryKey: queryKeys.alertLocations(id),
    queryFn: async (): Promise<TrailPoint[]> => {
      const { data, error } = await getSupabase()
        .from('alert_locations')
        .select('location, recorded_at, accuracy_m, battery_pct')
        .eq('alert_id', id)
        .order('recorded_at', { ascending: true })
        .limit(2000)
      if (error) throw error
      return data.flatMap((row) => {
        const point = parsePoint(row.location)
        return point
          ? [{ ...point, at: row.recorded_at, accuracy_m: row.accuracy_m, battery_pct: row.battery_pct }]
          : []
      })
    },
  })
}

export function useAlertEvents(id: string) {
  return useQuery({
    queryKey: queryKeys.alertEvents(id),
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('alert_events')
        .select('*, actor:profiles!alert_events_actor_id_fkey(full_name)')
        .eq('alert_id', id)
        .order('created_at', { ascending: true })
        .limit(500)
      if (error) throw error
      return data
    },
  })
}

export interface EvidenceItem extends EvidenceRow {
  signedUrl: string | null
}

/** Evidence rows with 1-hour signed URLs (the bucket is private). */
export function useAlertEvidence(id: string) {
  return useQuery({
    queryKey: queryKeys.alertEvidence(id),
    // Signed URLs last an hour; refresh well before that.
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<EvidenceItem[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('evidence')
        .select('*')
        .eq('alert_id', id)
        .order('chunk_index', { ascending: true })
      if (error) throw error
      if (data.length === 0) return []
      const signed = await supabase.storage.from('evidence').createSignedUrls(
        data.map((e) => e.storage_path),
        3600,
      )
      const urls = new Map((signed.data ?? []).map((s) => [s.path, s.signedUrl]))
      return data.map((e) => ({ ...e, signedUrl: urls.get(e.storage_path) ?? null }))
    },
  })
}

export function useMedicalCard(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.medicalCard(userId ?? ''),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('medical_cards')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useEmergencyContacts(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.contacts(userId ?? ''),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', userId!)
        .order('is_primary', { ascending: false })
        .order('position', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

/** Verified guardians who are available right now and have shared a position. */
export function useAvailableGuardians(region: Region) {
  return useQuery({
    queryKey: queryKeys.guardians(region),
    queryFn: async (): Promise<MapMarker[]> => {
      const { data, error } = await getSupabase()
        .from('profiles')
        .select('id, full_name, last_location')
        .eq('guardian_status', 'verified')
        .eq('guardian_available', true)
        .not('last_location', 'is', null)
        .or(regionFilter(region))
        .limit(200)
      if (error) throw error
      return data.flatMap((g) => {
        const position = parsePoint(g.last_location)
        return position ? [{ id: g.id, position, tone: 'info' as const, label: `Guardian ${g.full_name}` }] : []
      })
    },
  })
}

export function useUpdateAlertStatus(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (status: Exclude<AlertStatus, 'active'>) => {
      // The DB trigger stamps resolved_at / resolved_by and logs a status_changed event.
      const { error } = await getSupabase().from('alerts').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts })
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats })
    },
  })
}

export function useAddAdminNote(id: string) {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (note: string) => {
      const { error } = await getSupabase()
        .from('alert_events')
        .insert({ alert_id: id, kind: 'admin_note', actor_id: profile?.id ?? null, payload: { note } })
      if (error) throw error
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.alertEvents(id) }),
  })
}
