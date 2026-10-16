import { useState } from 'react'
import { Button, ConfirmDialog } from '@/components/ui'
import { errorMessage } from '@/lib/errors'
import { useModerateReport } from '@/lib/queries'

/** Approve right away; reject through a dialog with an optional note for the audit trail. */
export function ModerationActions({ reportId, size = 'sm' }: { reportId: string; size?: 'sm' | 'md' }) {
  const moderate = useModerateReport()
  const [rejecting, setRejecting] = useState(false)

  return (
    <span className="inline-flex gap-1.5">
      <Button
        size={size}
        disabled={moderate.isPending}
        onClick={() => moderate.mutate({ id: reportId, status: 'approved' })}
      >
        Approve
      </Button>
      <Button size={size} variant="secondary" disabled={moderate.isPending} onClick={() => setRejecting(true)}>
        Reject
      </Button>
      {moderate.isError && !rejecting && (
        <span role="alert" className="self-center text-xs font-bold text-danger-ink">
          {errorMessage(moderate.error)}
        </span>
      )}
      <ConfirmDialog
        open={rejecting}
        title="Reject this report?"
        description="It stays hidden from the community feed and won't be used to train the risk model."
        confirmLabel="Reject report"
        withNote={{ label: 'Note (optional)', placeholder: 'e.g. duplicate, not a safety issue, abusive' }}
        busy={moderate.isPending}
        error={moderate.isError ? errorMessage(moderate.error) : null}
        onClose={() => setRejecting(false)}
        onConfirm={(note) =>
          moderate.mutate({ id: reportId, status: 'rejected', note }, { onSuccess: () => setRejecting(false) })
        }
      />
    </span>
  )
}
