import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/cn'

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  size?: 'sm' | 'md'
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-ink text-white hover:bg-[#1c2738]',
  secondary: 'bg-subtle text-ink hover:bg-hairline',
  outline: 'bg-card text-ink border border-[#e1e4e9] hover:bg-ground',
  danger: 'bg-danger text-white hover:bg-danger-ink',
}

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-[34px] px-3 text-[13px] rounded-[10px]',
  md: 'h-10 px-3.5 text-sm rounded-control',
}

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-bold transition-colors disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
