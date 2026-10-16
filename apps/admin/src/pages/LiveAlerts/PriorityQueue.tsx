import { motion } from 'motion/react'
import { Link } from 'react-router'
import { ShieldCheck } from 'lucide-react'
import { Badge, Card, EmptyState, ErrorState, Skeleton } from '@/components/ui'
import { errorMessage } from '@/lib/errors'
import { alertTone, modelScoreChips, triggerIcon, type AlertTone } from '@/lib/alertPresentation'
import { cn } from '@/lib/cn'
import { emergencyTypeLabel, statusLabel, timeAgo, triggerLabel } from '@/lib/format'
import { formatCoords } from '@/lib/geo'
import { fadeUp, stagger } from '@/lib/motion'
import { type LiveAlertsData, useAlertSummary } from '@/lib/queries'
import { useNow } from '@/lib/useNow'
import type { LiveAlert } from '@/types'

const toneStyles: Record<AlertTone, { card: string; score: string }> = {
  danger: { card: 'border-[#f3c5c9] bg-[#fff8f8] hover:border-[#eba7ad]', score: 'bg-danger text-white' },
  warning: { card: 'border-[#f5ddb5] bg-[#fffbf3] hover:border-[#eccb93]', score: 'bg-[#fce3b6] text-[#7a3e06]' },
  neutral: { card: 'border-[#eceef1] bg-card hover:border-hairline', score: 'bg-subtle text-ink' },
}

function AlertCard({ alert, now }: { alert: LiveAlert; now: number }) {
  const tone = alertTone(alert)
  const styles = toneStyles[tone]
  const Icon = triggerIcon[alert.trigger_source]
  const chips = modelScoreChips(alert.model_scores)
  const summary = useAlertSummary(alert)
  const summaryText = alert.ai_summary ?? summary.data
  const place = alert.address ?? (alert.position ? formatCoords(alert.position) : 'Waiting for location')
  const title =
    alert.emergency_type === 'unknown'
      ? triggerLabel[alert.trigger_source]
      : `${triggerLabel[alert.trigger_source]} · ${emergencyTypeLabel[alert.emergency_type]}`

  return (
    <motion.div variants={fadeUp}>
      <Link
        to={`/alerts/${alert.id}`}
        className={cn('flex gap-3.5 rounded-tile border p-3.5 text-ink no-underline transition-colors', styles.card)}
      >
        <span
          className={cn('flex size-[52px] shrink-0 flex-col items-center justify-center rounded-[14px]', styles.score)}
          aria-label={alert.priority_score != null ? `Priority ${alert.priority_score}` : triggerLabel[alert.trigger_source]}
        >
          {alert.priority_score != null ? (
            <>
              <span className="text-xl leading-none font-extrabold">{alert.priority_score}</span>
              <span className="text-[9px] font-extrabold">PRIORITY</span>
            </>
          ) : (
            <Icon aria-hidden="true" size={22} strokeWidth={1.9} />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex justify-between gap-2">
            <span className="text-[15px] font-extrabold">{title}</span>
            <span className="shrink-0 text-xs text-ink-3">{timeAgo(alert.created_at, now)}</span>
          </div>
          <span className="truncate text-[13px] text-ink-2">
            {alert.person?.full_name || 'Unknown user'} · {place}
          </span>
          {summaryText && <span className="text-[13px] leading-snug text-ink">{summaryText}</span>}
          {(alert.is_duress || alert.status !== 'active' || chips.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {alert.is_duress && <Badge tone="solid-danger">Duress PIN used</Badge>}
              {alert.status !== 'active' && <Badge tone="neutral">{statusLabel[alert.status]}</Badge>}
              {chips.map((chip) => (
                <Badge key={chip} tone="outline">
                  {chip}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

type PriorityQueueProps = {
  data: LiveAlertsData | undefined
  isLoading: boolean
  error: unknown
  onRetry: () => void
}

export function PriorityQueue({ data, isLoading, error, onRetry }: PriorityQueueProps) {
  const now = useNow(15_000)
  const active = data?.active ?? []
  const recent = data?.recent ?? []

  return (
    <Card variant="panel" aria-labelledby="queue-title" className="flex min-w-0 flex-[1_1_420px] flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="queue-title" className="m-0 text-[17px] font-extrabold">
          Alert queue
        </h2>
        <span className="text-[13px] text-ink-3">Highest priority first</span>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading alerts">
          <Skeleton className="h-[82px]" />
          <Skeleton className="h-[82px]" />
        </div>
      )}
      {error != null && !data && <ErrorState message={errorMessage(error)} onRetry={onRetry} />}

      {data && active.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title="No active alerts right now."
          description="New SOS alerts and trip check-ins appear here the moment they're raised."
        />
      )}

      {active.length > 0 && (
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-3">
          {active.map((alert) => (
            <AlertCard key={alert.id} alert={alert} now={now} />
          ))}
        </motion.div>
      )}

      {recent.length > 0 && (
        <>
          <h3 className="m-0 mt-2 text-xs font-bold tracking-[0.06em] text-ink-3 uppercase">Earlier today</h3>
          <div className="flex flex-col gap-2.5">
            {recent.map((alert) => (
              <AlertCard key={alert.id} alert={alert} now={now} />
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
