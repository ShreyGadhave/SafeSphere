import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/cn'

/** Horizontally scrollable table shell; wide tables scroll inside the card on small screens. */
export function Table({ className, minWidth = 680, ...props }: ComponentPropsWithoutRef<'table'> & { minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table style={{ minWidth }} className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  )
}

export function Th({ className, ...props }: ComponentPropsWithoutRef<'th'>) {
  return (
    <th
      scope="col"
      className={cn('px-2.5 py-2 text-left text-xs font-bold tracking-[0.05em] text-ink-3 uppercase', className)}
      {...props}
    />
  )
}

export function Tr({ className, ...props }: ComponentPropsWithoutRef<'tr'>) {
  return <tr className={cn('border-t border-[#eef0f3]', className)} {...props} />
}

export function Td({ className, ...props }: ComponentPropsWithoutRef<'td'>) {
  return <td className={cn('px-2.5 py-3 align-middle', className)} {...props} />
}
