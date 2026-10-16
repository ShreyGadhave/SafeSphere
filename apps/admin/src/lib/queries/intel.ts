import { useQuery, useQueryClient } from '@tanstack/react-query'
import { env } from '@/lib/env'
import { regionFilter } from '@/lib/regions'
import { getSupabase } from '@/lib/supabase'
import type { LiveAlert, Region } from '@/types'
import { queryKeys } from './keys'

/**
 * One-line Groq summary for an alert (H4). Stored on the alert after the first request, so this
 * only calls the ML API for alerts that don't have one yet; failures fall back to no summary.
 */
export function useAlertSummary(alert: Pick<LiveAlert, 'id' | 'ai_summary'>) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: ['alerts', 'summary', alert.id],
    enabled: !alert.ai_summary && Boolean(import.meta.env.VITE_ML_API_URL),
    staleTime: Infinity,
    retry: 1,
    queryFn: async (): Promise<string | null> => {
      const res = await fetch(`${env.mlApiUrl}/summaries/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alert.id }),
      })
      if (!res.ok) return null
      const body = (await res.json()) as { text: string }
      void qc.invalidateQueries({ queryKey: queryKeys.alerts })
      return body.text
    },
  })
}

export type CountRow = { key: string; count: number }
export type Analytics = {
  reportsByCategory: CountRow[]
  incidentsByHour: number[]
  alertsByTrigger: CountRow[]
  outcomes: CountRow[]
  falseAlarmRate: number | null
  totals: { reports: number; alerts: number }
}

function countBy<T>(rows: T[], key: (r: T) => string): CountRow[] {
  const m = new Map<string, number>()
  rows.forEach((r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1))
  return [...m.entries()].map(([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count)
}

/** Analytics (H7): reports and alerts in a region over the last `days`. */
export function useAnalytics(region: Region, days: number) {
  return useQuery({
    queryKey: ['stats', 'analytics', region, days],
    queryFn: async (): Promise<Analytics> => {
      const supabase = getSupabase()
      const since = new Date(Date.now() - days * 86_400_000).toISOString()
      const [reports, alerts] = await Promise.all([
        supabase.from('reports').select('category, created_at, status').gte('created_at', since).or(regionFilter(region)).limit(5000),
        supabase.from('alerts').select('trigger_source, status, created_at').gte('created_at', since).or(regionFilter(region)).limit(5000),
      ])
      if (reports.error) throw reports.error
      if (alerts.error) throw alerts.error
      const hours = Array.from({ length: 24 }, () => 0)
      for (const r of [...reports.data, ...alerts.data]) {
        // Hour of day in India (UTC+5:30).
        const d = new Date(new Date(r.created_at).getTime() + 330 * 60_000)
        hours[d.getUTCHours()] += 1
      }
      const closed = alerts.data.filter((a) => a.status !== 'active')
      return {
        reportsByCategory: countBy(reports.data.filter((r) => r.status !== 'rejected'), (r) => r.category),
        incidentsByHour: hours,
        alertsByTrigger: countBy(alerts.data, (a) => a.trigger_source),
        outcomes: countBy(alerts.data, (a) => a.status),
        falseAlarmRate: closed.length ? closed.filter((a) => a.status === 'false_alarm').length / closed.length : null,
        totals: { reports: reports.data.length, alerts: alerts.data.length },
      }
    },
  })
}

export type ModelEntry = {
  name: string
  version: string
  notes: string | null
  metrics: Record<string, unknown>
  created_at: string
}

/** Active models with their evaluation metrics (H8), plus live false-alarm feedback. */
export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const supabase = getSupabase()
      const [models, anomalies, alerts] = await Promise.all([
        supabase.from('model_registry').select('name, version, notes, metrics, created_at').eq('is_active', true),
        supabase.from('trip_anomalies').select('user_response'),
        supabase.from('alerts').select('trigger_source, status').neq('status', 'active'),
      ])
      if (models.error) throw models.error
      const order = ['risk', 'audio', 'motion', 'anomaly', 'nlp', 'triage']
      const feedback = {
        tripChecks: anomalies.data?.length ?? 0,
        tripAnsweredOk: anomalies.data?.filter((a) => a.user_response === 'ok').length ?? 0,
        aiAlertsClosed: alerts.data?.filter((a) => ['motion', 'audio', 'ride_anomaly'].includes(a.trigger_source)).length ?? 0,
        aiFalseAlarms:
          alerts.data?.filter((a) => ['motion', 'audio', 'ride_anomaly'].includes(a.trigger_source) && a.status === 'false_alarm')
            .length ?? 0,
      }
      return {
        models: (models.data as ModelEntry[]).sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name)),
        feedback,
      }
    },
  })
}
