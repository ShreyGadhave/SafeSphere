import { useQuery } from '@tanstack/react-query'
import { regionFilter } from '@/lib/regions'
import { getSupabase } from '@/lib/supabase'
import type { Region } from '@/types'
import { queryKeys } from './keys'

export interface DashboardStats {
  activeSos: number
  activeTrips: number
  pendingReports: number
  /** Median seconds from alert to first guardian response or resolution, last 7 days; null if no data. */
  medianResponseS: number | null
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function useDashboardStats(region: Region) {
  return useQuery({
    queryKey: queryKeys.dashboardStats(region),
    queryFn: async (): Promise<DashboardStats> => {
      const supabase = getSupabase()
      const filter = regionFilter(region)
      const since = new Date(Date.now() - WEEK_MS).toISOString()
      const [sos, trips, reports, week] = await Promise.all([
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('status', 'active').or(filter),
        supabase.from('trips').select('id', { count: 'exact', head: true }).eq('status', 'active').or(filter),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending').or(filter),
        supabase.from('alerts').select('id, created_at, resolved_at').gte('created_at', since).or(filter).limit(500),
      ])
      for (const r of [sos, trips, reports, week]) if (r.error) throw r.error

      const alerts = week.data ?? []
      const firstGuardian = new Map<string, number>()
      if (alerts.length > 0) {
        const { data: events, error } = await supabase
          .from('alert_events')
          .select('alert_id, created_at')
          .eq('kind', 'guardian_accepted')
          .in(
            'alert_id',
            alerts.map((a) => a.id),
          )
        if (error) throw error
        for (const e of events) {
          const t = new Date(e.created_at).getTime()
          const prev = firstGuardian.get(e.alert_id)
          if (prev === undefined || t < prev) firstGuardian.set(e.alert_id, t)
        }
      }
      const responses = alerts.flatMap((a) => {
        const start = new Date(a.created_at).getTime()
        const candidates = [firstGuardian.get(a.id), a.resolved_at ? new Date(a.resolved_at).getTime() : undefined]
          .filter((t): t is number => t !== undefined && t >= start)
        return candidates.length ? [(Math.min(...candidates) - start) / 1000] : []
      })

      return {
        activeSos: sos.count ?? 0,
        activeTrips: trips.count ?? 0,
        pendingReports: reports.count ?? 0,
        medianResponseS: median(responses),
      }
    },
  })
}

/** Small counts for the sidebar badges (all regions). */
export function useNavCounts() {
  return useQuery({
    queryKey: queryKeys.navCounts,
    queryFn: async () => {
      const supabase = getSupabase()
      const [sos, reports] = await Promise.all([
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      return { activeSos: sos.count ?? 0, pendingReports: reports.count ?? 0 }
    },
  })
}
