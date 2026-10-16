/**
 * Domain types for the dashboard. Database shapes come from the generated
 * `database.types.ts` (regenerate after migrations — see supabase/README.md);
 * the rest are UI-only types.
 */
import type { Database } from './database.types'

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]

export type City = Enums<'city'>
export type UserRole = Enums<'user_role'>
export type EmergencyType = Enums<'emergency_type'>
export type AlertTrigger = Enums<'alert_trigger'>
export type AlertStatus = Enums<'alert_status'>
export type AlertEventKind = Enums<'alert_event_kind'>
export type ReportCategory = Enums<'report_category'>
export type ReportStatus = Enums<'report_status'>
export type Urgency = Enums<'urgency'>

export type AlertRow = Tables<'alerts'>
export type AlertLocationRow = Tables<'alert_locations'>
export type AlertEventRow = Tables<'alert_events'>
export type EvidenceRow = Tables<'evidence'>
export type ReportRow = Tables<'reports'>
export type ProfileRow = Tables<'profiles'>
export type MedicalCardRow = Tables<'medical_cards'>
export type EmergencyContactRow = Tables<'emergency_contacts'>

/** Dashboard groups Mumbai and Navi Mumbai into one region (shared road network). */
export type Region = 'mumbai_region' | 'delhi' | 'pune'

export interface LngLat {
  lng: number
  lat: number
}

export interface MapMarker {
  id: string
  position: LngLat
  tone: 'danger' | 'warning' | 'neutral' | 'info'
  label: string
  pulse?: boolean
}

export interface MapLine {
  id: string
  coordinates: LngLat[]
  color?: string
}

/** An alert as shown in the live queue: the row plus who raised it and where they are now. */
export interface LiveAlert extends AlertRow {
  person: { full_name: string; phone: string | null } | null
  position: LngLat | null
}

/** Shape returned by the get_shared_alert() RPC (public live-location page). */
export interface SharedAlert {
  id: string
  status: AlertStatus
  emergency_type: EmergencyType
  started_at: string
  person: string
  latest: { lat: number; lng: number; accuracy_m: number | null; battery_pct: number | null; at: string } | null
  /** [lng, lat] pairs, oldest first. */
  trail: [number, number][]
}

/** Shape returned by the get_shared_trip() RPC (public trip page). */
export interface SharedTrip {
  id: string
  status: Enums<'trip_status'>
  mode: Enums<'trip_mode'>
  person: string
  destination_name: string | null
  destination: { lat: number; lng: number }
  expected_arrival_at: string | null
  vehicle_plate: string | null
  vehicle_description: string | null
  driver_name: string | null
  latest: { lat: number; lng: number; at: string } | null
}
