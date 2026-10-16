import { useState } from 'react'
import { motion } from 'motion/react'
import { MapPin, MessageSquareCheck } from 'lucide-react'
import { ModerationActions } from '@/components/ModerationActions'
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui'
import { errorMessage } from '@/lib/errors'
import { categoryLabel, formatDateTime, timeAgo } from '@/lib/format'
import { formatCoords, googleMapsUrl } from '@/lib/geo'
import { fadeUp, stagger } from '@/lib/motion'
import { useLiveRealtime, usePendingReports, type PendingReport } from '@/lib/queries'
import { regions } from '@/lib/regions'
import type { Region } from '@/types'

const urgencyTone = { high: 'danger', medium: 'warning', low: 'neutral' } as const

function ReportCard({ report }: { report: PendingReport }) {
  const toxic = report.toxicity != null && report.toxicity >= 0.7
  const [revealed, setRevealed] = useState(!toxic)
  const aiDiffers = report.ai_category != null && report.ai_category !== report.category

  return (
    <motion.article variants={fadeUp} className="flex flex-col gap-3 rounded-card bg-card p-[18px] sm:flex-row">
      {report.mediaUrl && (
        <a href={report.mediaUrl} target="_blank" rel="noreferrer" className="shrink-0">
          <img
            src={report.mediaUrl}
            alt="Photo attached to the report"
            className="h-28 w-full rounded-tile object-cover sm:w-36"
            loading="lazy"
          />
        </a>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="outline">{categoryLabel[report.category]}</Badge>
          {aiDiffers && <Badge tone="info">AI suggests {categoryLabel[report.ai_category!]}</Badge>}
          {report.ai_confidence != null && <Badge tone="neutral">Confidence {report.ai_confidence.toFixed(2)}</Badge>}
          {report.ai_urgency && <Badge tone={urgencyTone[report.ai_urgency]}>{report.ai_urgency} urgency</Badge>}
          {toxic && <Badge tone="danger">Toxicity {report.toxicity!.toFixed(2)}</Badge>}
          {report.duplicate_of && <Badge tone="warning">Possible duplicate</Badge>}
        </div>
        {revealed ? (
          <p className="m-0 text-[15px] leading-relaxed whitespace-pre-wrap">{report.description}</p>
        ) : (
          <p className="m-0 flex flex-wrap items-center gap-2 text-sm text-ink-3">
            Hidden: possibly abusive language.
            <Button size="sm" variant="secondary" onClick={() => setRevealed(true)}>
              Show text
            </Button>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
          <span>{report.is_anonymous ? 'Anonymous' : (report.author?.full_name ?? 'Unknown user')}</span>
          <span>Happened {formatDateTime(report.occurred_at)}</span>
          <span>Posted {timeAgo(report.created_at)}</span>
          {report.position && (
            <a
              href={googleMapsUrl(report.position)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold"
            >
              <MapPin aria-hidden="true" size={14} />
              {report.address ?? formatCoords(report.position)}
            </a>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-start sm:justify-end">
        <ModerationActions reportId={report.id} size="md" />
      </div>
    </motion.article>
  )
}

export function ReportsPage() {
  const [region, setRegion] = useState<Region | 'all'>('all')
  useLiveRealtime()
  const { data, isLoading, error, refetch } = usePendingReports({ region })

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Community reports waiting for review, oldest first. Approved reports appear in the app feed."
        actions={[{ id: 'all' as const, label: 'All cities' }, ...regions].map((r) => (
          <Button
            key={r.id}
            variant="outline"
            aria-pressed={region === r.id}
            onClick={() => setRegion(r.id)}
            className={region === r.id ? 'border-ink text-ink' : 'font-semibold text-ink-2'}
          >
            {r.label}
          </Button>
        ))}
      />

      {isLoading && (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading reports">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      )}
      {error != null && !data && (
        <Card variant="panel">
          <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
        </Card>
      )}
      {data && data.length === 0 && (
        <Card variant="panel">
          <EmptyState
            icon={MessageSquareCheck}
            title="All caught up."
            description="There are no reports waiting for review. New ones appear here instantly."
          />
        </Card>
      )}
      {data && data.length > 0 && (
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-3">
          {data.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </motion.div>
      )}
    </>
  )
}
