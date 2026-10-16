import type { ReactNode } from 'react'
import { Logo } from '@/components/brand/Logo'

/** Minimal frame for the public share pages: no admin chrome, readable at 360 px. */
export function ShareLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-ground">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <Logo />
        <span className="text-xs font-semibold text-ink-3">Shared with you</span>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col gap-3.5 px-4 pt-2 pb-10">{children}</main>
    </div>
  )
}

export function ShareMessage({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
}) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-card bg-card px-5 py-10 text-center">
      {icon}
      <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.01em]">{title}</h1>
      {children && <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-ink-2">{children}</div>}
    </section>
  )
}

/** Primary emergency action: always one tap away on the share pages. */
export function Call112({ variant = 'danger' }: { variant?: 'danger' | 'outline' }) {
  return (
    <a
      href="tel:112"
      className={
        variant === 'danger'
          ? 'flex h-14 items-center justify-center rounded-[18px] bg-danger text-[17px] font-extrabold text-white no-underline'
          : 'flex h-12 items-center justify-center rounded-tile border border-[#e1e4e9] bg-card text-[15px] font-bold text-ink no-underline'
      }
    >
      Call 112 (emergency)
    </a>
  )
}
