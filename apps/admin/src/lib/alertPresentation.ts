import {
  BatteryLow,
  Car,
  Footprints,
  Mic,
  PersonStanding,
  Siren,
  Smartphone,
  Timer,
  WifiOff,
  type LucideIcon,
} from 'lucide-react'
import type { AlertRow, AlertTrigger } from '@/types'

export type AlertTone = 'danger' | 'warning' | 'neutral'

export const triggerIcon: Record<AlertTrigger, LucideIcon> = {
  button: Siren,
  motion: PersonStanding,
  audio: Mic,
  shake: Smartphone,
  ride_anomaly: Car,
  walk_checkin: Footprints,
  checkin_timeout: Timer,
  low_battery: BatteryLow,
  heartbeat_lost: WifiOff,
}

const TRIP_TRIGGERS: ReadonlySet<AlertTrigger> = new Set([
  'ride_anomaly',
  'walk_checkin',
  'checkin_timeout',
  'low_battery',
  'heartbeat_lost',
])

/** Red for SOS-grade alerts (and any duress), amber for trip check-in alerts, neutral once closed. */
export function alertTone(alert: Pick<AlertRow, 'status' | 'trigger_source' | 'is_duress'>): AlertTone {
  if (alert.status !== 'active') return 'neutral'
  if (alert.is_duress) return 'danger'
  return TRIP_TRIGGERS.has(alert.trigger_source) ? 'warning' : 'danger'
}

const scoreLabel: Record<string, string> = {
  audio: 'Audio model',
  motion: 'Motion model',
  anomaly: 'Anomaly',
  area_risk: 'Area risk',
}

/** model_scores JSON → chips like "Motion model 0.93", "Area risk 71". */
export function modelScoreChips(scores: AlertRow['model_scores']): string[] {
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) return []
  return Object.entries(scores).flatMap(([key, value]) => {
    if (typeof value !== 'number') return []
    const label = scoreLabel[key] ?? key.replace(/_/g, ' ')
    return [`${label} ${value <= 1 ? value.toFixed(2) : Math.round(value)}`]
  })
}
