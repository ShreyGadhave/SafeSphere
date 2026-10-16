import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/cn'

type CardProps = ComponentPropsWithoutRef<'section'> & {
  /** "panel" is the larger 22px-radius container used for page sections. */
  variant?: 'card' | 'panel'
}

export function Card({ variant = 'card', className, ...props }: CardProps) {
  return (
    <section
      className={cn(
        'bg-card',
        variant === 'panel' ? 'rounded-panel p-[18px]' : 'rounded-card p-[18px]',
        className,
      )}
      {...props}
    />
  )
}
