import { Button, Card, Table, Td, Th, Tr } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { PendingReport, ReportCategory } from '@/types'

const categoryLabel: Record<ReportCategory, string> = {
  harassment: 'Harassment',
  theft: 'Theft',
  accident: 'Accident',
  infrastructure: 'Infrastructure',
  medical: 'Medical',
  fire: 'Fire',
  other: 'Other',
}

export function ReportsReviewTable({ reports }: { reports: PendingReport[] }) {
  return (
    <Card variant="panel" aria-labelledby="review-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="review-title" className="m-0 text-[17px] font-extrabold">
          Reports awaiting review
        </h2>
        <span className="text-[13px] text-ink-3">AI suggests a category; you decide</span>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Report</Th>
            <Th>AI category</Th>
            <Th>Confidence</Th>
            <Th>Flags</Th>
            <Th className="text-right">Action</Th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <Tr key={report.id}>
              <Td className={cn('max-w-80', report.hidden && 'text-ink-3')}>
                {report.hidden ? `[${report.text}]` : report.text}
              </Td>
              <Td className="font-bold">{categoryLabel[report.aiCategory]}</Td>
              <Td>{report.confidence.toFixed(2)}</Td>
              <Td className={report.flag?.tone === 'danger' ? 'font-bold text-danger-ink' : 'text-ink-3'}>
                {report.flag?.label ?? 'None'}
              </Td>
              <Td className="text-right whitespace-nowrap">
                {/* TODO(moderation): update reports.status via Supabase. */}
                <span className="inline-flex gap-1.5">
                  <Button size="sm">Approve</Button>
                  <Button size="sm" variant="secondary">
                    Reject
                  </Button>
                </span>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}
