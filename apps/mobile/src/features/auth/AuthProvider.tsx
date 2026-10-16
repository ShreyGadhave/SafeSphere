import type { Session, User } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

/** `undefined` while the stored session is still loading, `null` when signed out. */
type AuthState = { session: Session | null | undefined };

const AuthContext = createContext<AuthState | null>(null);

/** Single source of the Supabase session for the whole app (one auth listener, not one per screen). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext value={{ session }}>{children}</AuthContext>;
}

function useAuthState(): AuthState {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useSession must be used inside <AuthProvider>');
  return ctx;
}

/** Current Supabase session: `undefined` while loading, `null` when signed out. */
export function useSession(): Session | null | undefined {
  return useAuthState().session;
}

/** Signed-in user, or null. */
export function useUser(): User | null {
  return useAuthState().session?.user ?? null;
}
