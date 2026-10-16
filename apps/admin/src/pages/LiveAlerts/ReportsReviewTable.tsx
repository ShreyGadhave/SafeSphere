import { Link } from 'react-router'
import { MessageSquareCheck } from 'lucide-react'
import { ModerationActions } from '@/components/ModerationActions'
import { Card, EmptyState, ErrorState, Skeleton, Table, Td, Th, Tr } from '@/components/ui'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/cn'
import { categoryLabel } from '@/lib/format'
import { usePendingReports } from '@/lib/queries'
import type { Region } from '@/types'

/** Top of the moderation queue, embedded on Live alerts. The full queue lives on /reports. */
export function ReportsReviewTable({ region }: { region: Region }) {
  const { data, isLoading, error, refetch } = usePendingReports({ region, limit: 5 })

  return (
    <Card variant="panel" aria-labelledby="review-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="review-title" className="m-0 text-[17px] font-extrabold">
          Reports awaiting review
        </h2>
        <Link to="/reports" className="text-[13px] font-bold">
          Review all
        </Link>
      </div>
      {isLoading && <Skeleton className="h-24" />}
      {error != null && !data && <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />}
      {data && data.length === 0 && (
        <EmptyState icon={MessageSquareCheck} title="Nothing to review." description="New community reports land here first." />
      )}
      {data && data.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Report</Th>
              <Th>Category</Th>
              <Th>AI confidence</Th>
              <Th>Flags</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((report) => {
              const toxic = report.toxicity != null && report.toxicity >= 0.7
              const flags = [
                toxic ? `Toxicity ${report.toxicity!.toFixed(2)}` : null,
                report.duplicate_of ? 'Possible duplicate' : null,
              ].filter(Boolean)
              return (
                <Tr key={report.id}>
                  <Td className={cn('max-w-80', toxic && 'text-ink-3')}>
                    {toxic ? '[Hidden: possibly abusive — open to read]' : report.description}
                  </Td>
                  <Td className="font-bold">{categoryLabel[report.ai_category ?? report.category]}</Td>
                  <Td>{report.ai_confidence != null ? report.ai_confidence.toFixed(2) : '—'}</Td>
                  <Td className={toxic ? 'font-bold text-danger-ink' : 'text-ink-3'}>
                    {flags.length ? flags.join(' · ') : 'None'}
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    <ModerationActions reportId={report.id} />
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      )}
    </Card>
  )
}
