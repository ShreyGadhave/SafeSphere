import type { Region } from '@/types'

/** React Query keys in one place so realtime handlers invalidate exactly what they should. */
export const queryKeys = {
  alerts: ['alerts'] as const,
  liveAlerts: (region: Region) => ['alerts', 'live', region] as const,
  alert: (id: string) => ['alerts', 'detail', id] as const,
  alertLocations: (id: string) => ['alerts', 'detail', id, 'locations'] as const,
  alertEvents: (id: string) => ['alerts', 'detail', id, 'events'] as const,
  alertEvidence: (id: string) => ['alerts', 'detail', id, 'evidence'] as const,
  medicalCard: (userId: string) => ['people', userId, 'medical'] as const,
  contacts: (userId: string) => ['people', userId, 'contacts'] as const,
  guardians: (region: Region) => ['guardians', 'available', region] as const,
  reports: ['reports'] as const,
  pendingReports: (region: Region | 'all', limit: number) => ['reports', 'pending', region, limit] as const,
  stats: ['stats'] as const,
  dashboardStats: (region: Region) => ['stats', 'dashboard', region] as const,
  navCounts: ['stats', 'nav'] as const,
  sharedAlert: (token: string) => ['shared', 'alert', token] as const,
  sharedTrip: (token: string) => ['shared', 'trip', token] as const,
}
