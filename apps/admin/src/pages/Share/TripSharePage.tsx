import { lazy, Suspense, useMemo } from 'react'
import { useParams } from 'react-router'
import { motion } from 'motion/react'
import { Link2Off, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Skeleton } from '@/components/ui'
import { formatClock, timeAgo } from '@/lib/format'
import { googleMapsUrl } from '@/lib/geo'
import { fadeUp } from '@/lib/motion'
import { useSharedTrip } from '@/lib/queries'
import { useNow } from '@/lib/useNow'
import { Call112, ShareLayout, ShareMessage } from './ShareLayout'

const ShareMap = lazy(() => import('./ShareMap').then((m) => ({ default: m.ShareMap })))

export function TripSharePage() {
  const { token = '' } = useParams()
  const { data, isLoading, error, refetch } = useSharedTrip(token)
  const now = useNow(1000)
  // Stable map inputs: the page re-renders every second for the "x s ago" label.
  const lat = data?.latest?.lat
  const lng = data?.latest?.lng
  const latest = useMemo(() => (lat != null && lng != null ? { lat, lng } : null), [lat, lng])
  const dLat = data?.destination.lat
  const dLng = data?.destination.lng
  const destination = useMemo(() => (dLat != null && dLng != null ? { lat: dLat, lng: dLng } : null), [dLat, dLng])

  if (isLoading) {
    return (
      <ShareLayout>
        <div role="status" aria-label="Loading trip" className="flex flex-col gap-3.5">
          <Skeleton className="h-28" />
          <Skeleton className="h-[48vh]" />
        </div>
      </ShareLayout>
    )
  }

  if (error && data === undefined) {
    return (
      <ShareLayout>
        <ShareMessage icon={<Link2Off aria-hidden="true" size={36} className="text-ink-3" />} title="Couldn't load this page">
          <p className="m-0">Check your internet connection and try again.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="h-12 rounded-tile bg-ink px-5 text-[15px] font-bold text-white"
          >
            Try again
          </button>
        </ShareMessage>
      </ShareLayout>
    )
  }

  if (!data) {
    return (
      <ShareLayout>
        <ShareMessage icon={<Link2Off aria-hidden="true" size={36} className="text-ink-3" />} title="This link has expired">
          <p className="m-0">Trip links stop working 12 hours after the trip starts, or if the link is incomplete.</p>
        </ShareMessage>
      </ShareLayout>
    )
  }

  const name = data.person || 'Someone'
  const destinationName = data.destination_name || 'their destination'

  if (data.status === 'completed') {
    return (
      <ShareLayout>
        <ShareMessage icon={<ShieldCheck aria-hidden="true" size={40} className="text-safe" />} title={`${name} arrived safely`}>
          <p className="m-0">They reached {destinationName}. Location sharing has stopped.</p>
        </ShareMessage>
      </ShareLayout>
    )
  }
  if (data.status === 'cancelled') {
    return (
      <ShareLayout>
        <ShareMessage icon={<ShieldCheck aria-hidden="true" size={40} className="text-ink-3" />} title={`${name} ended this trip`}>
          <p className="m-0">Location sharing has stopped.</p>
        </ShareMessage>
      </ShareLayout>
    )
  }

  const escalated = data.status === 'escalated'

  return (
    <ShareLayout>
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className={`flex flex-col gap-2 rounded-card p-5 ${escalated ? 'bg-danger-soft' : 'bg-card'}`}
      >
        {escalated ? (
          <span className="flex items-center gap-2 text-[13px] font-extrabold tracking-[0.08em] text-danger-ink">
            <ShieldAlert aria-hidden="true" size={16} /> THIS TRIP RAISED AN SOS
          </span>
        ) : (
          <span className="flex items-center gap-2 text-[13px] font-bold text-safe-ink">
            <span aria-hidden="true" className="size-2 animate-beat rounded-full bg-safe" />
            {data.mode === 'ride' ? 'Ride' : 'Walk'} in progress
          </span>
        )}
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.02em]">
          {name} is on the way to {destinationName}
        </h1>
        {data.expected_arrival_at && (
          <p className="m-0 text-[15px] text-ink-2">Expected around {formatClock(data.expected_arrival_at)}</p>
        )}
      </motion.section>

      {data.mode === 'ride' && (data.vehicle_plate || data.driver_name || data.vehicle_description) && (
        <section aria-label="Vehicle" className="flex items-center gap-3 rounded-card bg-card p-4">
          <span className="flex min-w-0 flex-1 flex-col">
            {data.driver_name && <span className="text-base font-bold">{data.driver_name}</span>}
            {data.vehicle_description && <span className="text-[13px] text-ink-3">{data.vehicle_description}</span>}
          </span>
          {data.vehicle_plate && (
            <span className="shrink-0 rounded-md border-[1.5px] border-ink bg-[#FCD34D] px-2.5 py-1.5 text-sm font-extrabold tracking-[0.04em]">
              {data.vehicle_plate}
            </span>
          )}
        </section>
      )}

      <section aria-label="Trip map" className="relative h-[48vh] min-h-[280px] overflow-hidden rounded-card bg-[#eceee9]">
        <Suspense fallback={<div className="absolute inset-0" role="status" aria-label="Loading map" />}>
          <ShareMap latest={latest} destination={destination} live label={`Live location of ${name} and destination`} />
        </Suspense>
      </section>

      {data.latest && (
        <p className="m-0 text-center text-sm text-ink-3">Location updated {timeAgo(data.latest.at, now)}</p>
      )}

      {escalated ? <Call112 /> : <Call112 variant="outline" />}
      {latest && (
        <a
          href={googleMapsUrl(latest)}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 items-center justify-center rounded-tile border border-[#e1e4e9] bg-card text-[15px] font-bold text-ink no-underline"
        >
          Open in Google Maps
        </a>
      )}
    </ShareLayout>
  )
}
