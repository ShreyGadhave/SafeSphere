import type { Enums } from '@/lib/supabase';

export type EmergencyType = Enums<'emergency_type'>;
export type AlertTrigger = Enums<'alert_trigger'>;

/** Order matches the SOS screen chips. 'unknown' is the silent default, never shown as a chip. */
export const EMERGENCY_TYPES: { value: Exclude<EmergencyType, 'unknown'>; label: string }[] = [
  { value: 'medical', label: 'Medical' },
  { value: 'accident', label: 'Accident' },
  { value: 'crime', label: 'Crime' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'fire', label: 'Fire' },
  { value: 'other', label: 'Other' },
];

export const EMERGENCY_TYPE_LABEL: Record<EmergencyType, string> = {
  unknown: 'Emergency',
  medical: 'Medical emergency',
  accident: 'Accident',
  crime: 'Crime',
  harassment: 'Harassment',
  fire: 'Fire',
  other: 'Emergency',
};

export type Helpline = { number: string; label: string; description: string };

/** Shown on the SOS screen grid. */
export const PRIMARY_HELPLINES: Helpline[] = [
  { number: '112', label: 'Emergency', description: 'National emergency number' },
  { number: '100', label: 'Police', description: 'Police control room' },
  { number: '108', label: 'Ambulance', description: 'Emergency ambulance' },
  { number: '1091', label: 'Women', description: 'Women helpline' },
];

/** Shown in the "More helplines" sheet. */
export const MORE_HELPLINES: Helpline[] = [
  { number: '101', label: 'Fire', description: 'Fire brigade' },
  { number: '102', label: 'Ambulance', description: 'Ambulance (pregnancy & child care)' },
  { number: '181', label: 'Women', description: 'Women in distress helpline' },
  { number: '1098', label: 'Child', description: 'Childline' },
  { number: '1930', label: 'Cybercrime', description: 'Cyber fraud & cybercrime' },
];

export const SOS_TIMING = {
  /** B1: press and hold this long to start the countdown. */
  holdMs: 3000,
  /** B1: cancel window after the hold completes. */
  countdownS: 5,
  /** B5: "Are you OK?" window for AI-detected triggers. */
  confirmS: 10,
  /** B2: if no type is picked within this time, the alert goes out as 'unknown'. */
  typePickMs: 3000,
  /** Location samples while active. */
  locationIntervalMs: 5000,
  /** B8: audio evidence chunk length and total cap. */
  audioChunkS: 30,
  audioMaxS: 600,
  /** Wrong PIN attempts before the alert is treated as duress. */
  maxWrongPins: 5,
} as const;

export const STORAGE_KEYS = {
  /** Persisted SOS session (machine state + alert info). */
  session: 'safesphere.sos.active',
  /** Read by the background location task. */
  tracking: 'safesphere.sos.tracking',
  /** Offline write queue. */
  outbox: 'safesphere.sos.outbox',
  /** Contacts + medical card + name, written by onboarding/contacts and refreshed here. */
  recipients: 'safesphere.cache.sosRecipients',
  /** App settings (silentMode, sirenMode). */
  settings: 'safesphere.settings',
} as const;

export const SOS_LOCATION_TASK = 'safesphere-sos-location';
export const EVIDENCE_BUCKET = 'evidence';
