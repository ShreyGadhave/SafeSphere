/**
 * Domain types shared across the dashboard. They mirror the planned Supabase
 * schema (supabase/migrations); regenerate from the database once it exists
 * (`supabase gen types typescript`) and replace these hand-written shapes.
 */

export type City = 'mumbai' | 'navi_mumbai' | 'delhi' | 'pune'

/** Dashboard groups Mumbai and Navi Mumbai into one region (shared road network). */
export type Region = 'mumbai_region' | 'delhi' | 'pune'

export type EmergencyType = 'medical' | 'accident' | 'crime' | 'harassment' | 'fire' | 'other' | 'unknown'

export type AlertTrigger =
  | 'button'
  | 'motion'
  | 'audio'
  | 'shake'
  | 'ride_anomaly'
  | 'checkin_timeout'
  | 'battery'

export type AlertStatus = 'active' | 'resolved' | 'cancelled' | 'false_alarm'

export type PriorityLevel = 'high' | 'medium' | 'low'

export interface LngLat {
  lng: number
  lat: number
}

export interface AlertSignal {
  label: string
}

export interface PriorityAlert {
  id: string
  title: string
  personName: string
  place: string
  detail: string
  minutesAgo: number
  /** Triage score 0–100 from ML-8. */
  priority: number
  level: PriorityLevel
  /** Visual tone: SOS-grade alerts are danger, Safe Ride anomalies are warning. */
  tone: 'danger' | 'warning' | 'neutral'
  signals: AlertSignal[]
  position: LngLat
}

export type ReportCategory =
  | 'harassment'
  | 'theft'
  | 'accident'
  | 'infrastructure'
  | 'medical'
  | 'fire'
  | 'other'

export interface PendingReport {
  id: string
  text: string
  /** True when the AI filter hid the text (e.g. abusive language). */
  hidden: boolean
  aiCategory: ReportCategory
  confidence: number
  flag: { label: string; tone: 'neutral' | 'danger' } | null
}

export interface MapMarker {
  id: string
  position: LngLat
  tone: 'danger' | 'warning' | 'neutral' | 'info'
  label: string
  pulse?: boolean
}
