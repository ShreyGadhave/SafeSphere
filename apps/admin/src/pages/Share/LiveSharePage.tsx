import { lazy, Suspense, useMemo } from 'react'
import { useParams } from 'react-router'
import { motion } from 'motion/react'
import { Link2Off, ShieldCheck } from 'lucide-react'
import { Skeleton } from '@/components/ui'
import { emergencyTypeLabel, formatClock, timeAgo } from '@/lib/format'
import { googleMapsUrl } from '@/lib/geo'
import { fadeUp } from '@/lib/motion'
import { useSharedAlert } from '@/lib/queries'
import { useNow } from '@/lib/useNow'
import { Call112, ShareLayout, ShareMessage } from './ShareLayout'

const ShareMap = lazy(() => import('./ShareMap').then((m) => ({ default: m.ShareMap })))

/** A position older than this is labelled "last known" — the phone may have lost signal. */
const STALE_MS = 2 * 60 * 1000

export function LiveSharePage() {
  const { token = '' } = useParams()
  const { data, isLoading, error, refetch } = useSharedAlert(token)
  const now = useNow(1000)
  // Stable map inputs: the page re-renders every second for the "x s ago" label.
  const lat = data?.latest?.lat
  const lng = data?.latest?.lng
  const latest = useMemo(() => (lat != null && lng != null ? { lat, lng } : null), [lat, lng])
  const trail = useMemo(() => (data?.trail ?? []).map(([tLng, tLat]) => ({ lng: tLng, lat: tLat })), [data?.trail])

  if (isLoading) {
    return (
      <ShareLayout>
        <div role="status" aria-label="Loading live location" className="flex flex-col gap-3.5">
          <Skeleton className="h-28" />
          <Skeleton className="h-[52vh]" />
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
        <Call112 />
      </ShareLayout>
    )
  }

  if (!data) {
    return (
      <ShareLayout>
        <ShareMessage
          icon={<Link2Off aria-hidden="true" size={36} className="text-ink-3" />}
          title="This link has expired"
        >
          <p className="m-0">Live location links stop working 24 hours after an alert starts, or if the link is incomplete.</p>
          <p className="m-0">If you think someone is in danger right now, call 112.</p>
        </ShareMessage>
        <Call112 />
      </ShareLayout>
    )
  }

  const name = data.person || 'Someone'

  if (data.status !== 'active') {
    const title =
      data.status === 'resolved'
        ? `${name} marked themselves safe`
        : data.status === 'cancelled'
          ? `${name} cancelled this alert`
          : 'This alert was closed as a false alarm'
    return (
      <ShareLayout>
        <ShareMessage icon={<ShieldCheck aria-hidden="true" size={40} className="text-safe" />} title={title}>
          <p className="m-0">Location sharing has stopped. If you're still worried, call them or call 112.</p>
        </ShareMessage>
        <Call112 variant="outline" />
      </ShareLayout>
    )
  }

  const updatedAt = data.latest?.at
  const stale = updatedAt ? now - new Date(updatedAt).getTime() > STALE_MS : false

  return (
    <ShareLayout>
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-2 rounded-card bg-danger-soft p-5"
      >
        <span className="flex items-center gap-2 text-[13px] font-extrabold tracking-[0.08em] text-danger-ink">
          <span aria-hidden="true" className="size-2.5 animate-beat rounded-full bg-danger" />
          SOS ACTIVE SINCE {formatClock(data.started_at).toUpperCase()}
        </span>
        <h1 className="m-0 text-[28px] leading-tight font-extrabold tracking-[-0.02em]">{name} needs help</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-2">
          {data.emergency_type !== 'unknown' && <>{emergencyTypeLabel[data.emergency_type]} emergency. </>}
          This page updates on its own every few seconds.
        </p>
      </motion.section>

      <section aria-label="Live location" className="relative h-[52vh] min-h-[300px] overflow-hidden rounded-card bg-[#eceee9]">
        <Suspense fallback={<div className="absolute inset-0" role="status" aria-label="Loading map" />}>
          <ShareMap latest={latest} trail={trail} live label={`Live location of ${name}`} />
        </Suspense>
        {!latest && (
          <div className="absolute inset-x-3 top-3 rounded-tile bg-card px-3 py-2 text-sm font-semibold text-ink-2">
            Waiting for {name}'s first location…
          </div>
        )}
      </section>

      {data.latest && (
        <dl className="m-0 grid grid-cols-3 gap-2 rounded-card bg-card p-4 text-center">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-semibold text-ink-3">{stale ? 'Last known' : 'Updated'}</dt>
            <dd className={`m-0 text-[15px] font-extrabold ${stale ? 'text-warning-ink' : ''}`}>{timeAgo(data.latest.at, now)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-semibold text-ink-3">Accuracy</dt>
            <dd className="m-0 text-[15px] font-extrabold">
              {data.latest.accuracy_m != null ? `±${Math.round(data.latest.accuracy_m)} m` : '—'}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-semibold text-ink-3">Battery</dt>
            <dd className="m-0 text-[15px] font-extrabold">
              {data.latest.battery_pct != null ? `${data.latest.battery_pct}%` : '—'}
            </dd>
          </div>
        </dl>
      )}
      {stale && (
        <p role="status" className="m-0 rounded-tile bg-warning-soft px-4 py-3 text-sm text-warning-ink">
          No new location for a while — their phone may have lost signal. This is the last known position.
        </p>
      )}

      <Call112 />
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
