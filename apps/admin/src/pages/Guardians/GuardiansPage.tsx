import { motion } from 'motion/react'
import { ShieldCheck } from 'lucide-react'
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui'
import { errorMessage } from '@/lib/errors'
import { timeAgo } from '@/lib/format'
import { fadeUp, stagger } from '@/lib/motion'
import { useGuardians, useSetGuardianStatus } from '@/lib/queries'
import { useNow } from '@/lib/useNow'

/** H6 guardian verification: approve volunteers, see their response record, suspend them. */
export function GuardiansPage() {
  const now = useNow(60_000)
  const guardians = useGuardians()
  const setStatus = useSetGuardianStatus()
  const pending = guardians.data?.filter((g) => g.guardian_status === 'pending') ?? []
  const others = guardians.data?.filter((g) => g.guardian_status !== 'pending') ?? []

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Guardians" subtitle="Verified volunteers get a push for any SOS within 5 km" />
      {guardians.isError ? (
        <ErrorState message={errorMessage(guardians.error)} onRetry={() => void guardians.refetch()} />
      ) : guardians.isPending ? (
        <Skeleton className="h-48" />
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
          <motion.div variants={fadeUp}>
            <Card variant="panel" className="flex flex-col gap-3">
              <h2 className="m-0 text-[17px] font-extrabold">Waiting for verification ({pending.length})</h2>
              {pending.length === 0 ? (
                <p className="m-0 text-sm text-ink-3">No pending requests. People ask to volunteer from Profile in the app.</p>
              ) : (
                pending.map((g) => (
                  <div key={g.id} className="flex flex-wrap items-center gap-3 rounded-tile border border-hairline p-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold">{g.full_name || 'Unnamed'}</div>
                      <div className="text-[13px] text-ink-2">
                        {g.phone ?? 'no phone'} · {g.city ?? 'no city'} · member since {new Date(g.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setStatus.mutate({ id: g.id, status: 'verified' })}>
                      Verify
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: g.id, status: 'revoked' })}>
                      Decline
                    </Button>
                  </div>
                ))
              )}
            </Card>
          </motion.div>
          <motion.div variants={fadeUp}>
            <Card variant="panel" className="flex flex-col gap-3">
              <h2 className="m-0 text-[17px] font-extrabold">Guardians</h2>
              {others.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="No guardians yet" description="Verified volunteers will be listed here." />
              ) : (
                others.map((g) => (
                  <div key={g.id} className="flex flex-wrap items-center gap-3 rounded-tile border border-hairline p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-extrabold">
                        {g.full_name || 'Unnamed'}
                        {g.guardian_status === 'verified' ? (
                          <Badge tone={g.guardian_available ? 'safe' : 'neutral'}>{g.guardian_available ? 'Available' : 'Off duty'}</Badge>
                        ) : (
                          <Badge tone="danger">Suspended</Badge>
                        )}
                      </div>
                      <div className="text-[13px] text-ink-2">
                        {g.city ?? 'no city'} · responded {g.stats.responded} of {g.stats.notified} alerts
                        {g.last_location_at ? ` · last seen ${timeAgo(g.last_location_at, now)}` : ''}
                      </div>
                    </div>
                    {g.guardian_status === 'verified' ? (
                      <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: g.id, status: 'revoked' })}>
                        Suspend
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setStatus.mutate({ id: g.id, status: 'verified' })}>
                        Reinstate
                      </Button>
                    )}
                  </div>
                ))
              )}
            </Card>
          </motion.div>
          {setStatus.error && <p className="m-0 text-sm text-danger-ink">{errorMessage(setStatus.error)}</p>}
        </motion.div>
      )}
    </div>
  )
}
