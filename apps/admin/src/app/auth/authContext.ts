import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { UserRole } from '@/types'

export interface StaffProfile {
  id: string
  full_name: string
  role: UserRole
}

export interface AuthState {
  /** 'loading' until the stored session (and its profile) has been read. */
  status: 'loading' | 'signed_out' | 'signed_in'
  session: Session | null
  profile: StaffProfile | null
  /** Admins and moderators may use the dashboard; RLS enforces the same rule server-side. */
  isStaff: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}

export const STAFF_ROLES: ReadonlySet<UserRole> = new Set(['admin', 'moderator'])
