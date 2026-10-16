import { Activity, Car, ChartColumn, Cpu, Map, MessageSquare, Shield, type LucideIcon } from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** Live count shown next to the label (see useNavCounts). */
  countKey?: 'activeSos' | 'pendingReports'
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Live alerts', icon: Activity, countKey: 'activeSos' },
  { to: '/trips', label: 'Safe Ride trips', icon: Car },
  { to: '/reports', label: 'Reports', icon: MessageSquare, countKey: 'pendingReports' },
  { to: '/risk-map', label: 'Risk map & zones', icon: Map },
  { to: '/guardians', label: 'Guardians', icon: Shield },
  { to: '/analytics', label: 'Analytics', icon: ChartColumn },
  { to: '/models', label: 'AI models', icon: Cpu },
]
