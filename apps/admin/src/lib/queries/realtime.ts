import { useEffect } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { env } from '@/lib/env'
import { getSupabase } from '@/lib/supabase'
import type { AlertLocationRow } from '@/types'
import { parsePoint } from '@/lib/geo'
import type { TrailPoint } from './alerts'
import { queryKeys } from './keys'

/** Collects invalidations for a short window so a burst of rows causes one refetch. */
function createBatchedInvalidator(invalidate: (key: QueryKey) => void, delayMs = 400) {
  const pending = new Map<string, QueryKey>()
  let timer: number | undefined
  return {
    add(key: QueryKey) {
      pending.set(JSON.stringify(key), key)
      if (timer === undefined) {
        timer = window.setTimeout(() => {
          timer = undefined
          const keys = [...pending.values()]
          pending.clear()
          keys.forEach(invalidate)
        }, delayMs)
      }
    },
    cancel() {
      if (timer !== undefined) window.clearTimeout(timer)
      pending.clear()
    },
  }
}

const enabled = () => env.hasSupabase && !env.devBypassAuth

/**
 * Dashboard-wide realtime: any change to alerts, their locations/events, guardian responses or
 * reports refreshes the live queue, stats and moderation lists. RLS decides what staff receive.
 */
export function useLiveRealtime() {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!enabled()) return
    const supabase = getSupabase()
    const batch = createBatchedInvalidator((key) => void queryClient.invalidateQueries({ queryKey: key }))
    const refreshAlerts = () => {
      batch.add(queryKeys.alerts)
      batch.add(queryKeys.stats)
    }
    const channel = supabase
      .channel(`admin-live-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, refreshAlerts)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alert_locations' }, () =>
        batch.add(['alerts', 'live']),
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alert_events' }, refreshAlerts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guardian_responses' }, refreshAlerts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        batch.add(queryKeys.reports)
        batch.add(queryKeys.stats)
      })
      .subscribe()
    return () => {
      batch.cancel()
      void supabase.removeChannel(channel)
    }
  }, [queryClient])
}

/** Realtime for one alert's detail page: new trail points are appended directly, events refetched. */
export function useAlertRealtime(alertId: string) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!enabled()) return
    const supabase = getSupabase()
    const batch = createBatchedInvalidator((key) => void queryClient.invalidateQueries({ queryKey: key }))
    const channel = supabase
      .channel(`admin-alert-${alertId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alert_locations', filter: `alert_id=eq.${alertId}` },
        (payload) => {
          const row = payload.new as AlertLocationRow
          const point = parsePoint(row.location)
          if (!point) return
          queryClient.setQueryData<TrailPoint[]>(queryKeys.alertLocations(alertId), (prev = []) => [
            ...prev,
            { ...point, at: row.recorded_at, accuracy_m: row.accuracy_m, battery_pct: row.battery_pct },
          ])
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alert_events', filter: `alert_id=eq.${alertId}` },
        () => {
          batch.add(queryKeys.alertEvents(alertId))
          // `evidence` isn't in the realtime publication; the app logs a recording_uploaded event
          // with each clip, so refresh evidence on any new event.
          batch.add(queryKeys.alertEvidence(alertId))
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'alerts', filter: `id=eq.${alertId}` },
        () => batch.add(queryKeys.alert(alertId)),
      )
      .subscribe()
    return () => {
      batch.cancel()
      void supabase.removeChannel(channel)
    }
  }, [alertId, queryClient])
}
