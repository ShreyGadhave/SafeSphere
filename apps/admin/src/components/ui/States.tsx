import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

/** Calm, intentional empty state: an icon chip, one line of reassurance, one line of context. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  tone = 'safe',
  className,
}: {
  icon: LucideIcon
  title: string
  description?: ReactNode
  tone?: 'safe' | 'neutral'
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-2.5 px-4 py-10 text-center', className)}>
      <span
        className={cn(
          'grid size-12 place-items-center rounded-tile',
          tone === 'safe' ? 'bg-safe-soft text-safe-ink' : 'bg-subtle text-ink-2',
        )}
      >
        <Icon aria-hidden="true" size={24} strokeWidth={1.8} />
      </span>
      <p className="m-0 text-[15px] font-extrabold">{title}</p>
      {description && <p className="m-0 max-w-xs text-[13px] leading-relaxed text-ink-3">{description}</p>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <p className="m-0 text-sm font-bold text-danger-ink">{message}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-tile bg-subtle', className)} />
}
