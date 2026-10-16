import { useState } from 'react'
import { ChartColumn } from 'lucide-react'
import { motion } from 'motion/react'
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton, StatTile } from '@/components/ui'
import { errorMessage } from '@/lib/errors'
import { categoryLabel, statusLabel, triggerLabel } from '@/lib/format'
import { fadeUp, stagger } from '@/lib/motion'
import { type CountRow, useAnalytics } from '@/lib/queries'
import { regions } from '@/lib/regions'
import type { AlertStatus, AlertTrigger, ReportCategory, Region } from '@/types'

const RANGES = [7, 30, 90] as const

/** Horizontal bars, one series: value labels on every bar, native tooltip, table semantics. */
function BarList({ title, rows, label }: { title: string; rows: CountRow[]; label: (k: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <Card variant="panel" className="flex flex-col gap-3">
      <h2 className="m-0 text-[17px] font-extrabold">{title}</h2>
      {rows.length === 0 ? (
        <p className="m-0 text-sm text-ink-3">No data in this period.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{title}</caption>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} title={`${label(r.key)}: ${r.count}`}>
                <th scope="row" className="w-40 py-1 pr-3 text-left font-semibold text-ink-2">
                  {label(r.key)}
                </th>
                <td className="py-1">
                  <div className="h-3 rounded-r bg-info" style={{ width: `${(r.count / max) * 100}%`, minWidth: 4 }} />
                </td>
                <td className="w-12 py-1 pl-3 text-right font-bold tabular-nums">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

/** 24 vertical bars (hour of day, IST). Labels every 3 h; exact values in tooltips and the table. */
function HourChart({ hours }: { hours: number[] }) {
  const max = Math.max(1, ...hours)
  const peak = hours.indexOf(Math.max(...hours))
  return (
    <Card variant="panel" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-[17px] font-extrabold">Reports and alerts by hour of day</h2>
        {hours.some(Boolean) && <span className="text-sm text-ink-3">Busiest: {peak}:00–{peak + 1}:00</span>}
      </div>
      <div className="flex h-40 items-end gap-[2px]" role="img" aria-label={`Hourly counts: ${hours.map((h, i) => `${i}h ${h}`).join(', ')}`}>
        {hours.map((h, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end" title={`${i}:00 — ${h}`}>
            <div className="w-full rounded-t-[4px] bg-info group-hover:opacity-80" style={{ height: `${(h / max) * 100}%`, minHeight: h ? 3 : 0 }} />
          </div>
        ))}
      </div>
      <div className="flex text-xs text-ink-3" aria-hidden="true">
        {hours.map((_, i) => (
          <span key={i} className="flex-1 text-center">
            {i % 3 === 0 ? i : ''}
          </span>
        ))}
      </div>
    </Card>
  )
}

export function AnalyticsPage() {
  const [region, setRegion] = useState<Region>(regions[0].id)
  const [days, setDays] = useState<(typeof RANGES)[number]>(30)
  const q = useAnalytics(region, days)
  const d = q.data

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Analytics"
        subtitle="Community reports and SOS alerts over time"
        actions={
          <div className="flex flex-wrap gap-2">
            {regions.map((r) => (
              <Button key={r.id} variant={r.id === region ? 'primary' : 'secondary'} size="sm" onClick={() => setRegion(r.id)}>
                {r.label}
              </Button>
            ))}
            {RANGES.map((n) => (
              <Button key={n} variant={n === days ? 'primary' : 'secondary'} size="sm" onClick={() => setDays(n)}>
                {n} days
              </Button>
            ))}
          </div>
        }
      />

      {q.isError ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : q.isPending || !d ? (
        <Skeleton className="h-72" />
      ) : d.totals.reports + d.totals.alerts === 0 ? (
        <EmptyState icon={ChartColumn} title="No activity yet" description="Charts fill in as people use SafeSphere in this region." />
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
          <motion.div variants={fadeUp} className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
            <StatTile label="Community reports" value={String(d.totals.reports)} />
            <StatTile label="SOS alerts" value={String(d.totals.alerts)} />
            <StatTile
              label="False-alarm rate (closed alerts)"
              value={d.falseAlarmRate == null ? '—' : `${Math.round(d.falseAlarmRate * 100)}%`}
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <HourChart hours={d.incidentsByHour} />
          </motion.div>
          <motion.div variants={fadeUp} className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-4">
            <BarList title="Reports by category" rows={d.reportsByCategory} label={(k) => categoryLabel[k as ReportCategory] ?? k} />
            <BarList title="Alerts by trigger" rows={d.alertsByTrigger} label={(k) => triggerLabel[k as AlertTrigger] ?? k} />
            <BarList title="Alert outcomes" rows={d.outcomes} label={(k) => statusLabel[k as AlertStatus] ?? k} />
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
