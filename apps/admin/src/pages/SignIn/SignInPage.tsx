import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/app/auth/authContext'
import { Logo } from '@/components/brand/Logo'
import { Button, Card } from '@/components/ui'
import { env } from '@/lib/env'
import { getSupabase } from '@/lib/supabase'

/** Admin sign-in with email + password (Supabase Auth). Role checks happen in RequireAdmin. */
export function SignInPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (auth.status === 'signed_in') return <Navigate to={from} replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const { error: authError } = await getSupabase().auth.signInWithPassword({ email, password })
      if (authError) {
        setError(
          authError.message === 'Invalid login credentials' ? 'That email and password don’t match.' : authError.message,
        )
      } else {
        navigate(from, { replace: true })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <Card variant="panel" className="flex w-full max-w-sm flex-col gap-5 p-6">
        <Logo />
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-2xl font-extrabold tracking-[-0.02em]">Admin sign in</h1>
          <p className="m-0 text-sm text-ink-3">For police, NGO and SafeSphere moderators.</p>
        </div>
        {!env.hasSupabase && (
          <p role="alert" className="m-0 rounded-control bg-warning-soft p-3 text-sm text-warning-ink">
            Supabase keys are missing. Add them to <code>apps/admin/.env</code> (see <code>.env.example</code>).
          </p>
        )}
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-control border border-hairline bg-card px-3 text-[15px] font-normal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-control border border-hairline bg-card px-3 text-[15px] font-normal"
            />
          </label>
          {error && (
            <p role="alert" className="m-0 text-sm font-semibold text-danger-ink">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy || !env.hasSupabase || auth.status === 'loading'} className="h-11">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </main>
  )
}
