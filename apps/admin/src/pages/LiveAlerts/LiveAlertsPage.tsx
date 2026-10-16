import { lazy, Suspense, useState } from 'react'
import { motion } from 'motion/react'
import { Button, PageHeader, StatTile } from '@/components/ui'
import { formatDuration } from '@/lib/format'
import { stagger } from '@/lib/motion'
import { useAvailableGuardians, useDashboardStats, useLiveAlerts, useLiveRealtime } from '@/lib/queries'
import { regions } from '@/lib/regions'
import type { Region } from '@/types'
import { PriorityQueue } from './PriorityQueue'
import { ReportsReviewTable } from './ReportsReviewTable'

// MapLibre is large; load the map panel in its own chunk so the queue renders first.
const AlertsMap = lazy(() => import('./AlertsMap').then((m) => ({ default: m.AlertsMap })))

const REGION_KEY = 'safesphere.admin.region'

function readRegion(): Region {
  try {
    const saved = localStorage.getItem(REGION_KEY)
    if (regions.some((r) => r.id === saved)) return saved as Region
  } catch {
    /* storage unavailable — use the default */
  }
  return 'mumbai_region'
}

const today = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

export function LiveAlertsPage() {
  const [region, setRegion] = useState<Region>(readRegion)
  useLiveRealtime()
  const alerts = useLiveAlerts(region)
  const stats = useDashboardStats(region)
  const guardians = useAvailableGuardians(region)

  function chooseRegion(next: Region) {
    setRegion(next)
    try {
      localStorage.setItem(REGION_KEY, next)
    } catch {
      /* ignore */
    }
  }

  const s = stats.data
  const value = (n: number | undefined) => (n === undefined ? '—' : String(n))

  return (
    <>
      <PageHeader
        title="Live alerts"
        subtitle={today}
        actions={regions.map((r) => (
          <Button
            key={r.id}
            variant="outline"
            aria-pressed={region === r.id}
            onClick={() => chooseRegion(r.id)}
            className={region === r.id ? 'border-ink text-ink' : 'font-semibold text-ink-2'}
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
        <StatTile label="Active SOS" value={value(s?.activeSos)} live={Boolean(s?.activeSos)} />
        <StatTile label="Trips being monitored" value={value(s?.activeTrips)} />
        <StatTile label="Reports to review" value={value(s?.pendingReports)} />
        <StatTile
          label="Median first response (7 days)"
          value={s?.medianResponseS != null ? formatDuration(s.medianResponseS) : '—'}
        />
      </motion.div>

      <div className="flex flex-wrap items-stretch gap-4">
        <PriorityQueue
          data={alerts.data}
          isLoading={alerts.isLoading}
          error={alerts.error}
          onRetry={() => void alerts.refetch()}
        />
        <Suspense
          fallback={
            <div
              role="status"
              aria-label="Loading map"
              className="min-h-[420px] min-w-0 flex-[1.3_1_460px] rounded-panel bg-[#eceee9]"
            />
          }
        >
          <AlertsMap alerts={alerts.data?.active ?? []} guardians={guardians.data ?? []} region={region} />
        </Suspense>
      </div>

      <ReportsReviewTable region={region} />
    </>
  )
}
