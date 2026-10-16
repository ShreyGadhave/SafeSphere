import { Activity, Car, ChartColumn, Cpu, Map, MessageSquare, Shield, type LucideIcon } from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** Count shown next to the label. TODO: drive from live Supabase counts. */
  count?: { value: number; urgent?: boolean }
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Live alerts', icon: Activity, count: { value: 3, urgent: true } },
  { to: '/trips', label: 'Safe Ride trips', icon: Car },
  { to: '/reports', label: 'Reports', icon: MessageSquare, count: { value: 14 } },
  { to: '/risk-map', label: 'Risk map & zones', icon: Map },
  { to: '/guardians', label: 'Guardians', icon: Shield },
  { to: '/analytics', label: 'Analytics', icon: ChartColumn },
  { to: '/models', label: 'AI models', icon: Cpu },
]
