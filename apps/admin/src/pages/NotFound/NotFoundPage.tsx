import { Link } from 'react-router'
import { Logo } from '@/components/brand/Logo'

export function NotFoundPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo />
        <h1 className="m-0 text-2xl font-extrabold">Page not found</h1>
        <p className="m-0 text-sm text-ink-2">That address doesn't match any dashboard page.</p>
        <Link to="/" className="font-bold">
          Back to live alerts
        </Link>
      </div>
    </main>
  )
}
