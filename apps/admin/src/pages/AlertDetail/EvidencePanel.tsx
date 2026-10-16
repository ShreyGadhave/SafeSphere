import { FileAudio } from 'lucide-react'
import { Card, EmptyState, ErrorState, Skeleton } from '@/components/ui'
import { errorMessage } from '@/lib/errors'
import { formatClock } from '@/lib/format'
import { useAlertEvidence, type EvidenceItem } from '@/lib/queries'

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`
}

function Media({ item }: { item: EvidenceItem }) {
  if (!item.signedUrl) return <span className="text-[13px] text-ink-3">File not available</span>
  if (item.kind === 'audio') return <audio controls preload="none" src={item.signedUrl} className="h-10 w-full" />
  if (item.kind === 'photo')
    return <img src={item.signedUrl} alt={`Photo evidence ${item.chunk_index + 1}`} className="max-h-60 rounded-tile" />
  return <video controls preload="none" src={item.signedUrl} className="max-h-60 w-full rounded-tile" />
}

export function EvidencePanel({ alertId }: { alertId: string }) {
  const { data, isLoading, error, refetch } = useAlertEvidence(alertId)

  return (
    <Card variant="panel" aria-labelledby="evidence-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="evidence-title" className="m-0 text-[17px] font-extrabold">
          Evidence
        </h2>
        <span className="text-[13px] text-ink-3">Integrity: SHA-256 hash recorded at upload</span>
      </div>
      {isLoading && <Skeleton className="h-20" />}
      {error != null && !data && <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />}
      {data && data.length === 0 && (
        <EmptyState
          icon={FileAudio}
          tone="neutral"
          title="No recordings yet."
          description="Audio clips upload every 30 seconds while the SOS is active."
        />
      )}
      {data && data.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {data.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 rounded-tile border border-[#eef0f3] p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[15px] font-bold">
                  {item.kind === 'audio' ? 'Audio clip' : item.kind === 'photo' ? 'Photo' : 'Video'}{' '}
                  {item.chunk_index + 1}
                  {item.duration_s ? ` · ${Math.round(item.duration_s)} s` : ''}
                </span>
                <time dateTime={item.recorded_at} className="text-xs text-ink-3">
                  Recorded {formatClock(item.recorded_at)}
                </time>
              </div>
              <Media item={item} />
              <code className="text-xs break-all text-ink-3" title={item.sha256}>
                SHA-256 {shortHash(item.sha256)}
              </code>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
