/**
 * SAMPLE DATA ONLY — made-up people, plates and numbers for the Phase 0 UI.
 * TODO(live-data): replace with Supabase queries + realtime subscriptions on
 * `alerts`, `reports` and guardian locations once the schema is applied.
 */
import type { MapMarker, PendingReport, PriorityAlert, Region } from '@/types'

export const regions: { id: Region; label: string }[] = [
  { id: 'mumbai_region', label: 'Mumbai + Navi Mumbai' },
  { id: 'delhi', label: 'Delhi' },
  { id: 'pune', label: 'Pune' },
]

export const sampleStats = [
  { label: 'Active SOS', value: '3', live: true },
  { label: 'Rides being monitored', value: '128' },
  { label: 'Reports to review', value: '14' },
  { label: 'Median first response', value: '3m 40s' },
]

export const sampleAlerts: PriorityAlert[] = [
  {
    id: 'a1',
    title: 'Fall + scream detected',
    personName: 'Aisha K.',
    place: 'Andheri West',
    detail: 'not answering check-in',
    minutesAgo: 2,
    priority: 94,
    level: 'high',
    tone: 'danger',
    signals: [{ label: 'Motion model 0.93' }, { label: 'Audio model 0.88' }, { label: 'Area risk 71' }],
    position: { lng: 72.8296, lat: 19.1364 },
  },
  {
    id: 'a2',
    title: 'Safe Ride: cab left the route',
    personName: 'Neha S.',
    place: 'Saki Vihar Rd',
    detail: 'MH 02 EK 4471 · 420 m off route',
    minutesAgo: 5,
    priority: 81,
    level: 'high',
    tone: 'warning',
    signals: [{ label: 'Anomaly 0.91' }, { label: 'Check-in timed out' }],
    position: { lng: 72.8869, lat: 19.1145 },
  },
  {
    id: 'a3',
    title: 'Manual SOS · Medical',
    personName: 'Rohit P.',
    place: 'Vashi, Navi Mumbai',
    detail: 'guardian on the way',
    minutesAgo: 11,
    priority: 58,
    level: 'medium',
    tone: 'neutral',
    signals: [],
    position: { lng: 72.9986, lat: 19.0771 },
  },
]

export const sampleGuardians: MapMarker[] = [
  { id: 'g1', position: { lng: 72.8411, lat: 19.1295 }, tone: 'info', label: 'Guardian Rahul K.' },
  { id: 'g2', position: { lng: 72.9912, lat: 19.0702 }, tone: 'info', label: 'Guardian Sameer D.' },
]

export const sampleReports: PendingReport[] = [
  {
    id: 'r1',
    text: 'Chain snatching near Thane station east exit, two men on a bike',
    hidden: false,
    aiCategory: 'theft',
    confidence: 0.94,
    flag: { label: 'Similar report 20 min ago', tone: 'neutral' },
  },
  {
    id: 'r2',
    text: 'Open manhole on SV Road, no barricade, very dark',
    hidden: false,
    aiCategory: 'infrastructure',
    confidence: 0.89,
    flag: null,
  },
  {
    id: 'r3',
    text: 'Message hidden: abusive language',
    hidden: true,
    aiCategory: 'harassment',
    confidence: 0.61,
    flag: { label: 'Toxicity 0.87', tone: 'danger' },
  },
]
