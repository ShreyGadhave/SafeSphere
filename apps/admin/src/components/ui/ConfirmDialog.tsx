import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Button } from './Button'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel: string
  tone?: 'primary' | 'danger'
  /** Shows a textarea and passes its value to onConfirm. */
  withNote?: { label: string; placeholder?: string; required?: boolean }
  busy?: boolean
  error?: string | null
  onConfirm: (note: string) => void
  onClose: () => void
}

/** Modal confirm built on the native <dialog> (focus trap, Esc to close, inert background for free). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  withNote,
  busy = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [note, setNote] = useState('')

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setNote('')
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  const noteMissing = Boolean(withNote?.required) && note.trim() === ''

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        if (busy) e.preventDefault()
      }}
      className="m-auto w-[min(420px,calc(100vw-32px))] rounded-panel border-0 bg-card p-0 text-ink shadow-[0_20px_50px_rgba(14,23,38,.25)] backdrop:bg-[rgba(14,23,38,.35)]"
    >
      <form
        method="dialog"
        className="flex flex-col gap-4 p-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (!busy && !noteMissing) onConfirm(note)
        }}
      >
        <div className="flex flex-col gap-1.5">
          <h2 id={titleId} className="m-0 text-lg font-extrabold">
            {title}
          </h2>
          {description && <p className="m-0 text-sm leading-relaxed text-ink-2">{description}</p>}
        </div>
        {withNote && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {withNote.label}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={withNote.placeholder}
              rows={3}
              maxLength={500}
              className="resize-y rounded-control border border-hairline p-3 text-[15px] font-normal"
            />
          </label>
        )}
        {error && (
          <p role="alert" className="m-0 text-sm font-semibold text-danger-ink">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant={tone === 'danger' ? 'danger' : 'primary'} disabled={busy || noteMissing}>
            {busy ? 'Saving…' : confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
