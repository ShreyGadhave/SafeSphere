import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import type { SharedAlert, SharedTrip } from '@/types'
import { queryKeys } from './keys'

/**
 * Public share pages poll the token RPCs every 5 s (anonymous viewers can't use realtime on
 * RLS-protected tables). Polling stops once the alert/trip is over or the link is invalid.
 */
const POLL_MS = 5000

export function useSharedAlert(token: string) {
  return useQuery({
    queryKey: queryKeys.sharedAlert(token),
    queryFn: async (): Promise<SharedAlert | null> => {
      const { data, error } = await getSupabase().rpc('get_shared_alert', { p_token: token })
      if (error) throw error
      return (data as unknown as SharedAlert | null) ?? null
    },
    refetchInterval: (query) => (query.state.data?.status === 'active' ? POLL_MS : false),
    refetchIntervalInBackground: false,
    retry: 3,
    staleTime: 0,
  })
}

export function useSharedTrip(token: string) {
  return useQuery({
    queryKey: queryKeys.sharedTrip(token),
    queryFn: async (): Promise<SharedTrip | null> => {
      const { data, error } = await getSupabase().rpc('get_shared_trip', { p_token: token })
      if (error) throw error
      return (data as unknown as SharedTrip | null) ?? null
    },
    refetchInterval: (query) => (query.state.data?.status === 'active' ? POLL_MS : false),
    refetchIntervalInBackground: false,
    retry: 3,
    staleTime: 0,
  })
}
