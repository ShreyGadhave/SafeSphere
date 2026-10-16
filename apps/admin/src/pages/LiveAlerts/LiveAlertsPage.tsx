import { lazy, Suspense, useState } from 'react'
import { motion } from 'motion/react'
import { Badge, Button, PageHeader, StatTile } from '@/components/ui'
import { stagger } from '@/lib/motion'
import type { Region } from '@/types'
import { PriorityQueue } from './PriorityQueue'
import { ReportsReviewTable } from './ReportsReviewTable'
import { regions, sampleAlerts, sampleGuardians, sampleReports, sampleStats } from './sampleData'

// MapLibre is large; load the map panel in its own chunk so the queue renders first.
const AlertsMap = lazy(() => import('./AlertsMap').then((m) => ({ default: m.AlertsMap })))

const today = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

export function LiveAlertsPage() {
  // TODO(live-data): filter queries by region once data comes from Supabase.
  const [region, setRegion] = useState<Region>('mumbai_region')

  return (
    <>
      <PageHeader
        title="Live alerts"
        subtitle={
          <span className="inline-flex items-center gap-2">
            {today}
            <Badge tone="warning">Sample data</Badge>
          </span>
        }
        actions={regions.map((r) => (
          <Button
            key={r.id}
            variant="outline"
            aria-pressed={region === r.id}
            onClick={() => setRegion(r.id)}
            className={region === r.id ? 'text-ink' : 'font-semibold text-ink-2'}
          >
            {r.label}
          </Button>
        ))}
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5"
      >
        {sampleStats.map((stat) => (
          <StatTile key={stat.label} {...stat} />
        ))}
      </motion.div>

      <div className="flex flex-wrap items-stretch gap-4">
        <PriorityQueue alerts={sampleAlerts} />
        <Suspense
          fallback={
            <div
              role="status"
              aria-label="Loading map"
              className="min-h-[420px] min-w-0 flex-[1.3_1_460px] rounded-panel bg-[#eceee9]"
            />
          }
        >
          <AlertsMap alerts={sampleAlerts} guardians={sampleGuardians} />
        </Suspense>
      </div>

      <ReportsReviewTable reports={sampleReports} />
    </>
  )
}
