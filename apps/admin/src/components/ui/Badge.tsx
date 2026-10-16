import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'outline' | 'safe' | 'danger' | 'warning' | 'info' | 'solid-danger'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-subtle text-ink-2',
  outline: 'bg-card text-ink border border-[#eceef1]',
  safe: 'bg-safe-soft text-safe-ink',
  danger: 'bg-danger-soft text-danger-ink',
  warning: 'bg-warning-soft text-warning-ink',
  info: 'bg-info-soft text-info',
  'solid-danger': 'bg-danger text-white',
}

export function Badge({ tone = 'neutral', className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-lg px-2 py-[3px] text-xs font-bold', tones[tone], className)}>
      {children}
    </span>
  )
}
