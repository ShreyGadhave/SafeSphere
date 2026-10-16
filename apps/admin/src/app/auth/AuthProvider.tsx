import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { env } from '@/lib/env'
import { getSupabase } from '@/lib/supabase'
import { AuthContext, STAFF_ROLES, type AuthState, type StaffProfile } from './authContext'

const DEV_PROFILE: StaffProfile = { id: 'dev-bypass', full_name: 'Local developer', role: 'admin' }

/**
 * Tracks the Supabase session and the signed-in user's profile role. Pages read it via useAuth().
 * With VITE_DEV_BYPASS_AUTH=true it pretends to be an admin so the UI can be built without keys.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(!env.hasSupabase)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  useEffect(() => {
    if (env.devBypassAuth || !env.hasSupabase) return
    const supabase = getSupabase()
    let active = true
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
        setSessionLoaded(true)
      })
      .catch(() => active && setSessionLoaded(true))
    // Never call Supabase from inside this callback (it can deadlock the auth lock); just store it.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id ?? null

  useEffect(() => {
    if (env.devBypassAuth || !userId) return
    let active = true
    getSupabase()
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setProfile(data ?? null)
        setProfileUserId(userId)
      })
    return () => {
      active = false
    }
  }, [userId])

  const signOut = useCallback(async () => {
    if (env.hasSupabase && !env.devBypassAuth) await getSupabase().auth.signOut()
    queryClient.clear()
  }, [queryClient])

  const value = useMemo<AuthState>(() => {
    if (env.devBypassAuth) {
      return { status: 'signed_in', session: null, profile: DEV_PROFILE, isStaff: true, signOut }
    }
    if (!sessionLoaded) return { status: 'loading', session: null, profile: null, isStaff: false, signOut }
    if (!session) return { status: 'signed_out', session: null, profile: null, isStaff: false, signOut }
    // Signed in, but the profile for this user hasn't arrived yet.
    if (profileUserId !== session.user.id) {
      return { status: 'loading', session, profile: null, isStaff: false, signOut }
    }
    return {
      status: 'signed_in',
      session,
      profile,
      isStaff: profile != null && STAFF_ROLES.has(profile.role),
      signOut,
    }
  }, [session, sessionLoaded, profile, profileUserId, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
