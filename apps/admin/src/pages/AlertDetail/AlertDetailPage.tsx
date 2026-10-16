import { lazy, Suspense, useState } from 'react'
import { Link, useParams } from 'react-router'
import { motion } from 'motion/react'
import { ArrowLeft, Phone, ShieldAlert } from 'lucide-react'
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Skeleton } from '@/components/ui'
import { errorMessage } from '@/lib/errors'
import { alertTone, modelScoreChips, triggerIcon } from '@/lib/alertPresentation'
import { cn } from '@/lib/cn'
import { emergencyTypeLabel, formatDateTime, statusLabel, timeAgo, triggerLabel } from '@/lib/format'
import { formatCoords, googleMapsUrl } from '@/lib/geo'
import { fadeUp, stagger } from '@/lib/motion'
import {
  useAddAdminNote,
  useAlert,
  useAlertLocations,
  useAlertRealtime,
  useLiveRealtime,
  useUpdateAlertStatus,
} from '@/lib/queries'
import { useNow } from '@/lib/useNow'
import { ContactsPanel, MedicalCardPanel } from './AlertPeople'
import { AlertTimeline } from './AlertTimeline'
import { EvidencePanel } from './EvidencePanel'

const AlertTrailMap = lazy(() => import('./AlertTrailMap').then((m) => ({ default: m.AlertTrailMap })))

type Pending = 'resolved' | 'false_alarm' | 'note' | null

export function AlertDetailPage() {
  const { id = '' } = useParams()
  useLiveRealtime()
  useAlertRealtime(id)
  const alert = useAlert(id)
  const trail = useAlertLocations(id)
  const now = useNow(10_000)
  const updateStatus = useUpdateAlertStatus(id)
  const addNote = useAddAdminNote(id)
  const [pending, setPending] = useState<Pending>(null)

  if (alert.isLoading) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Loading alert">
        <Skeleton className="h-24" />
        <Skeleton className="h-[420px]" />
      </div>
    )
  }
  if (alert.error) return <ErrorState message={errorMessage(alert.error)} onRetry={() => void alert.refetch()} />
  const a = alert.data
  if (!a) {
    return (
      <Card variant="panel">
        <EmptyState icon={ShieldAlert} tone="neutral" title="Alert not found." description="It may have been deleted." />
        <Link to="/" className="block text-center text-sm font-bold">
          Back to live alerts
        </Link>
      </Card>
    )
  }

  const tone = alertTone(a)
  const Icon = triggerIcon[a.trigger_source]
  const latestPoint = trail.data?.at(-1)
  const latest = latestPoint ?? a.position
  const chips = modelScoreChips(a.model_scores)
  const isActive = a.status === 'active'
  const mutationError = updateStatus.isError
    ? errorMessage(updateStatus.error)
    : addNote.isError
      ? errorMessage(addNote.error)
      : null

  return (
    <>
      <Link to="/" className="inline-flex items-center gap-1.5 self-start text-sm font-bold text-ink-2 no-underline">
        <ArrowLeft aria-hidden="true" size={16} /> Live alerts
      </Link>

      <motion.header variants={fadeUp} initial="hidden" animate="show" className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            className={cn(
              'grid size-14 shrink-0 place-items-center rounded-[16px]',
              tone === 'danger' ? 'bg-danger text-white' : tone === 'warning' ? 'bg-[#fce3b6] text-[#7a3e06]' : 'bg-subtle text-ink',
            )}
          >
            <Icon aria-hidden="true" size={26} strokeWidth={1.9} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.02em]">
              {a.person?.full_name || 'Unknown user'}
            </h1>
            <span className="text-sm text-ink-2">
              {triggerLabel[a.trigger_source]} · {emergencyTypeLabel[a.emergency_type]} · started{' '}
              {formatDateTime(a.created_at)} ({timeAgo(a.created_at, now)})
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge tone={isActive ? 'danger' : 'neutral'}>{statusLabel[a.status]}</Badge>
              {a.priority_score != null && <Badge tone="outline">Priority {a.priority_score}</Badge>}
              {a.battery_pct != null && <Badge tone="outline">Battery {a.battery_pct}%</Badge>}
              {chips.map((c) => (
                <Badge key={c} tone="outline">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {a.person?.phone && (
            <a
              href={`tel:${a.person.phone.replace(/\s/g, '')}`}
              className="inline-flex h-10 items-center gap-1.5 rounded-control border border-[#e1e4e9] bg-card px-3.5 text-sm font-bold text-ink no-underline hover:bg-ground"
            >
              <Phone aria-hidden="true" size={16} /> Call {a.person.phone}
            </a>
          )}
          <Button variant="outline" onClick={() => setPending('note')}>
            Add note
          </Button>
          {isActive && (
            <>
              <Button variant="secondary" onClick={() => setPending('false_alarm')}>
                False alarm
              </Button>
              <Button onClick={() => setPending('resolved')}>Mark resolved</Button>
            </>
          )}
        </div>
      </motion.header>

      {a.is_duress && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-tile border border-[#f3c5c9] bg-danger-soft p-4 text-danger-ink"
        >
          <ShieldAlert aria-hidden="true" size={22} className="shrink-0" />
          <p className="m-0 text-sm leading-relaxed">
            <strong>Duress PIN used.</strong> Their phone shows this alert as cancelled so whoever is with them
            believes it stopped. Treat it as active and do not call them openly unless it's safe.
          </p>
        </div>
      )}

      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-wrap items-stretch gap-4">
        <motion.section
          variants={fadeUp}
          aria-label="Location trail"
          className="relative min-h-[420px] min-w-0 flex-[1.4_1_460px] overflow-hidden rounded-panel bg-[#eceee9]"
        >
          <Suspense fallback={<div className="absolute inset-0" role="status" aria-label="Loading map" />}>
            <AlertTrailMap trail={trail.data ?? []} fallback={a.position} active={isActive} />
          </Suspense>
          <div className="absolute bottom-3.5 left-3.5 flex max-w-[calc(100%-28px)] flex-wrap items-center gap-x-3 gap-y-1 rounded-[14px] bg-card px-3 py-2.5 text-xs font-bold shadow-sm">
            {latest ? (
              <>
                <span>{a.address ?? formatCoords(latest)}</span>
                {latestPoint && <span className="font-semibold text-ink-3">updated {timeAgo(latestPoint.at, now)}</span>}
                {latestPoint?.accuracy_m != null && (
                  <span className="font-semibold text-ink-3">±{Math.round(latestPoint.accuracy_m)} m</span>
                )}
                <a href={googleMapsUrl(latest)} target="_blank" rel="noreferrer">
                  Open in Google Maps
                </a>
              </>
            ) : (
              <span className="text-ink-3">Waiting for the first location…</span>
            )}
          </div>
        </motion.section>
        <AlertTimeline alertId={a.id} />
      </motion.div>

      <div className="flex flex-wrap items-stretch gap-4">
        <MedicalCardPanel userId={a.user_id} />
        <ContactsPanel userId={a.user_id} />
      </div>

      <EvidencePanel alertId={a.id} />

      <ConfirmDialog
        open={pending === 'resolved'}
        title="Mark this alert resolved?"
        description="Use this once the person is confirmed safe. Their contacts' live link stops updating."
        confirmLabel="Mark resolved"
        busy={updateStatus.isPending}
        error={mutationError}
        onClose={() => setPending(null)}
        onConfirm={() => updateStatus.mutate('resolved', { onSuccess: () => setPending(null) })}
      />
      <ConfirmDialog
        open={pending === 'false_alarm'}
        title="Mark as a false alarm?"
        description="The alert closes and is counted as a false alarm, which helps tune the AI triggers."
        confirmLabel="Mark false alarm"
        tone="danger"
        busy={updateStatus.isPending}
        error={mutationError}
        onClose={() => setPending(null)}
        onConfirm={() => updateStatus.mutate('false_alarm', { onSuccess: () => setPending(null) })}
      />
      <ConfirmDialog
        open={pending === 'note'}
        title="Add a note"
        description="Notes appear in this alert's timeline for every moderator."
        confirmLabel="Add note"
        withNote={{ label: 'Note', placeholder: 'e.g. Called Vashi police control room, PCR van dispatched', required: true }}
        busy={addNote.isPending}
        error={mutationError}
        onClose={() => setPending(null)}
        onConfirm={(note) => addNote.mutate(note.trim(), { onSuccess: () => setPending(null) })}
      />
    </>
  )
}
