import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { env } from '@/lib/env'
import { getSupabase } from '@/lib/supabase'

type GateState = 'checking' | 'allowed' | 'denied'

/** Roles allowed into the dashboard; mirrors profiles.role in the Supabase schema. */
const ADMIN_ROLES = new Set(['admin', 'moderator'])

/**
 * Route guard: requires a Supabase session whose profile role is admin or
 * moderator. VITE_DEV_BYPASS_AUTH=true skips the check for local UI work.
 * The database's row-level security is the real protection; this gate only
 * keeps non-admins out of the UI.
 */
export function RequireAdmin() {
  const location = useLocation()
  const [state, setState] = useState<GateState>(() => {
    if (env.devBypassAuth) return 'allowed'
    return env.hasSupabase ? 'checking' : 'denied'
  })

  useEffect(() => {
    if (env.devBypassAuth || !env.hasSupabase) return

    let cancelled = false
    async function check() {
      const supabase = getSupabase()
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) {
        if (!cancelled) setState('denied')
        return
      }
      const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!cancelled) setState(!error && profile && ADMIN_ROLES.has(profile.role) ? 'allowed' : 'denied')
    }
    check().catch(() => {
      if (!cancelled) setState('denied')
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (state === 'checking') {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-ink-3" role="status">
        Checking your access…
      </div>
    )
  }
  if (state === 'denied') {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
