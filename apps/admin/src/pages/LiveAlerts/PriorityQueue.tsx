import { motion } from 'motion/react'
import { Badge, Card } from '@/components/ui'
import { cn } from '@/lib/cn'
import { fadeUp, stagger } from '@/lib/motion'
import type { PriorityAlert } from '@/types'

const toneStyles: Record<PriorityAlert['tone'], { card: string; score: string }> = {
  danger: { card: 'border-[#f3c5c9] bg-[#fff8f8]', score: 'bg-danger text-white' },
  warning: { card: 'border-[#f5ddb5] bg-[#fffbf3]', score: 'bg-[#fce3b6] text-[#7a3e06]' },
  neutral: { card: 'border-[#eceef1] bg-card', score: 'bg-subtle text-ink' },
}

const levelLabel: Record<PriorityAlert['level'], string> = { high: 'HIGH', medium: 'MED', low: 'LOW' }

function AlertCard({ alert }: { alert: PriorityAlert }) {
  const tone = toneStyles[alert.tone]
  return (
    <motion.article variants={fadeUp} className={cn('flex gap-3.5 rounded-tile border p-3.5', tone.card)}>
      <span
        className={cn('flex size-[52px] shrink-0 flex-col items-center justify-center rounded-[14px]', tone.score)}
        aria-label={`Priority ${alert.priority}, ${alert.level}`}
      >
        <span className="text-xl leading-none font-extrabold">{alert.priority}</span>
        <span className="text-[9px] font-extrabold">{levelLabel[alert.level]}</span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex justify-between gap-2">
          <span className="text-[15px] font-extrabold">{alert.title}</span>
          <span className="shrink-0 text-xs text-ink-3">{alert.minutesAgo} min ago</span>
        </div>
        <span className="text-[13px] text-ink-2">
          {alert.personName} · {alert.place} · {alert.detail}
        </span>
        {alert.signals.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {alert.signals.map((signal) => (
              <Badge key={signal.label} tone="outline">
                {signal.label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </motion.article>
  )
}

export function PriorityQueue({ alerts }: { alerts: PriorityAlert[] }) {
  const sorted = [...alerts].sort((a, b) => b.priority - a.priority)
  return (
    <Card variant="panel" aria-labelledby="queue-title" className="flex min-w-0 flex-[1_1_420px] flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="queue-title" className="m-0 text-[17px] font-extrabold">
          Priority queue
        </h2>
        <span className="text-[13px] text-ink-3">Sorted by AI triage score</span>
      </div>
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-3">
        {sorted.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </motion.div>
    </Card>
  )
}
