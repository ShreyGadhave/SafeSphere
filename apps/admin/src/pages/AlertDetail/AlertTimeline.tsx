import {
  BellRing,
  CircleDot,
  MapPin,
  MessageSquareText,
  Mic,
  PhoneOutgoing,
  RefreshCw,
  Shield,
  ShieldCheck,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'
import { Card, EmptyState, ErrorState, Skeleton } from '@/components/ui'
import { errorMessage } from '@/lib/errors'
import { eventLabel, formatClock, statusLabel } from '@/lib/format'
import { useAlertEvents } from '@/lib/queries'
import { cn } from '@/lib/cn'
import type { AlertEventKind, AlertStatus } from '@/types'
import type { Json } from '@/types/database.types'

const eventIcon: Record<AlertEventKind, LucideIcon> = {
  created: CircleDot,
  sms_sent: MessageSquareText,
  call_placed: PhoneOutgoing,
  push_sent: BellRing,
  location_shared: MapPin,
  recording_uploaded: Mic,
  guardian_notified: BellRing,
  guardian_accepted: Shield,
  guardian_arrived: ShieldCheck,
  admin_note: StickyNote,
  status_changed: RefreshCw,
  resolved: ShieldCheck,
}

function isRecord(value: Json): value is Record<string, Json> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

/** One readable line from an event payload; unknown shapes just show nothing extra. */
function describe(kind: AlertEventKind, payload: Json): string | null {
  if (!isRecord(payload)) return null
  switch (kind) {
    case 'admin_note':
      return typeof payload.note === 'string' ? payload.note : null
    case 'status_changed': {
      const from = payload.from as AlertStatus | undefined
      const to = payload.to as AlertStatus | undefined
      return from && to ? `${statusLabel[from] ?? from} → ${statusLabel[to] ?? to}` : null
    }
    case 'guardian_accepted':
    case 'guardian_arrived':
      return typeof payload.distance_m === 'number' ? `${Math.round(payload.distance_m)} m away` : null
    case 'sms_sent': {
      const count = payload.count ?? payload.recipients
      if (typeof count === 'number') return `${count} contact${count === 1 ? '' : 's'}`
      if (Array.isArray(count)) return `${count.length} contact${count.length === 1 ? '' : 's'}`
      return null
    }
    case 'call_placed':
      return typeof payload.to === 'string' ? payload.to : null
    case 'recording_uploaded':
      return typeof payload.chunk_index === 'number' ? `Clip ${payload.chunk_index + 1}` : null
    default:
      return null
  }
}

export function AlertTimeline({ alertId }: { alertId: string }) {
  const { data, isLoading, error, refetch } = useAlertEvents(alertId)

  return (
    <Card variant="panel" aria-labelledby="timeline-title" className="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
      <h2 id="timeline-title" className="m-0 text-[17px] font-extrabold">
        Timeline
      </h2>
      {isLoading && <Skeleton className="h-40" />}
      {error != null && !data && <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />}
      {data && data.length === 0 && <EmptyState icon={CircleDot} tone="neutral" title="No events yet." />}
      {data && data.length > 0 && (
        <ol className="m-0 flex list-none flex-col p-0">
          {data.map((event, i) => {
            const Icon = eventIcon[event.kind]
            const detail = describe(event.kind, event.payload)
            const isNote = event.kind === 'admin_note'
            return (
              <li
                key={event.id}
                className={cn('flex items-start gap-3 py-2.5', i < data.length - 1 && 'border-b border-[#eef0f3]')}
              >
                <span
                  className={cn(
                    'grid size-[30px] shrink-0 place-items-center rounded-full',
                    isNote ? 'bg-info-soft text-info' : 'bg-subtle text-ink-2',
                  )}
                >
                  <Icon aria-hidden="true" size={16} strokeWidth={1.9} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] font-bold">{eventLabel[event.kind]}</span>
                  {detail && (
                    <span className={cn('text-[13px] text-ink-3', isNote && 'whitespace-pre-wrap text-ink-2')}>
                      {detail}
                    </span>
                  )}
                  {event.actor?.full_name && isNote && (
                    <span className="text-xs text-ink-3">by {event.actor.full_name}</span>
                  )}
                </span>
                <time dateTime={event.created_at} className="shrink-0 text-xs text-ink-3">
                  {formatClock(event.created_at)}
                </time>
              </li>
            )
          })}
        </ol>
      )}
    </Card>
  )
}
