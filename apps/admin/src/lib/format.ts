import type { AlertEventKind, AlertStatus, AlertTrigger, EmergencyType, ReportCategory } from '@/types'

export const emergencyTypeLabel: Record<EmergencyType, string> = {
  unknown: 'Type not given',
  medical: 'Medical',
  accident: 'Accident',
  crime: 'Crime',
  harassment: 'Harassment',
  fire: 'Fire',
  other: 'Other',
}

export const triggerLabel: Record<AlertTrigger, string> = {
  button: 'SOS button',
  motion: 'Fall / snatch detected',
  audio: 'Scream detected',
  shake: 'Shake SOS',
  ride_anomaly: 'Safe Ride: check-in missed',
  walk_checkin: 'Safe Walk: check-in missed',
  checkin_timeout: 'Check-in timer expired',
  low_battery: 'Battery low on a trip',
  heartbeat_lost: 'Phone went silent on a trip',
}

export const statusLabel: Record<AlertStatus, string> = {
  active: 'Active',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
  false_alarm: 'False alarm',
}

export const eventLabel: Record<AlertEventKind, string> = {
  created: 'Alert raised',
  sms_sent: 'SMS sent',
  call_placed: 'Call placed',
  push_sent: 'Push sent',
  location_shared: 'Live location shared',
  recording_uploaded: 'Audio clip uploaded',
  guardian_notified: 'Guardians notified',
  guardian_accepted: 'Guardian responding',
  guardian_arrived: 'Guardian arrived',
  admin_note: 'Admin note',
  status_changed: 'Status changed',
  resolved: 'Resolved',
}

export const categoryLabel: Record<ReportCategory, string> = {
  harassment: 'Harassment',
  theft: 'Theft',
  assault: 'Assault',
  accident: 'Accident',
  medical: 'Medical',
  fire: 'Fire',
  infrastructure: 'Infrastructure',
  suspicious: 'Suspicious activity',
  other: 'Other',
}

/** "just now", "45 s ago", "3 min ago", "2 h ago", "4 Oct". */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds} s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(iso))
}

/** 220 → "3m 40s", 4000 → "1h 6m". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function firstName(fullName: string | null | undefined): string {
  const name = fullName?.trim().split(/\s+/)[0]
  return name || 'Someone'
}
