import { Navigate, Outlet, useLocation } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { Button, Card } from '@/components/ui'
import { useAuth } from './auth/authContext'

/**
 * Route guard: requires a Supabase session whose profile role is admin or moderator.
 * Row-level security is the real protection; this only keeps non-staff out of the UI.
 */
export function RequireAdmin() {
  const location = useLocation()
  const auth = useAuth()

  if (auth.status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-ink-3" role="status">
        Checking your access…
      </div>
    )
  }
  if (auth.status === 'signed_out') {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  }
  if (!auth.isStaff) return <NotStaff email={auth.session?.user.email} onSignOut={auth.signOut} />
  return <Outlet />
}

function NotStaff({ email, onSignOut }: { email?: string; onSignOut: () => Promise<void> }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <Card variant="panel" className="flex w-full max-w-sm flex-col gap-4 p-6">
        <Logo />
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-xl font-extrabold tracking-[-0.01em]">This account isn't an admin</h1>
          <p className="m-0 text-sm leading-relaxed text-ink-2">
            {email ? <strong className="text-ink">{email}</strong> : 'This account'} is signed in, but only
            SafeSphere admins and moderators can use the dashboard. Ask an admin to give you the moderator role.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void onSignOut()} className="h-11">
          Sign out
        </Button>
      </Card>
    </main>
  )
}
