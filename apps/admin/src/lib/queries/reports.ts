import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/auth/authContext'
import { parsePoint } from '@/lib/geo'
import { regionFilter } from '@/lib/regions'
import { getSupabase } from '@/lib/supabase'
import type { LngLat, Region, ReportRow, ReportStatus } from '@/types'
import { queryKeys } from './keys'

export interface PendingReport extends ReportRow {
  author: { full_name: string } | null
  position: LngLat | null
  mediaUrl: string | null
}

/** Reports waiting for moderation, oldest first so nothing sits in the queue forever. */
export function usePendingReports({ region = 'all', limit = 100 }: { region?: Region | 'all'; limit?: number } = {}) {
  return useQuery({
    queryKey: queryKeys.pendingReports(region, limit),
    queryFn: async (): Promise<PendingReport[]> => {
      const supabase = getSupabase()
      let query = supabase
        .from('reports')
        // reports has two FKs to profiles (user_id, reviewed_by).
        .select('*, author:profiles!reports_user_id_fkey(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit)
      if (region !== 'all') query = query.or(regionFilter(region))
      const { data, error } = await query
      if (error) throw error

      const paths = data.flatMap((r) => (r.media_path ? [r.media_path] : []))
      const urls = new Map<string, string>()
      if (paths.length > 0) {
        const signed = await supabase.storage.from('report-media').createSignedUrls(paths, 3600)
        for (const s of signed.data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl)
      }
      return data.map((r) => ({
        ...r,
        position: parsePoint(r.location),
        mediaUrl: r.media_path ? (urls.get(r.media_path) ?? null) : null,
      }))
    },
  })
}

export interface ModerationInput {
  id: string
  status: Exclude<ReportStatus, 'pending'>
  note?: string
}

/** Approve / reject with an optimistic update: the report leaves every pending list at once. */
export function useModerateReport() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ id, status, note }: ModerationInput) => {
      const { error } = await getSupabase()
        .from('reports')
        .update({
          status,
          reviewed_by: profile?.id ?? null,
          reviewed_at: new Date().toISOString(),
          review_note: note?.trim() || null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id }) => {
      const key = ['reports', 'pending']
      await queryClient.cancelQueries({ queryKey: key })
      const snapshots = queryClient.getQueriesData<PendingReport[]>({ queryKey: key })
      for (const [queryKey, reports] of snapshots) {
        if (reports) queryClient.setQueryData(queryKey, reports.filter((r) => r.id !== id))
      }
      return { snapshots }
    },
    onError: (_error, _input, context) => {
      for (const [queryKey, reports] of context?.snapshots ?? []) queryClient.setQueryData(queryKey, reports)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats })
    },
  })
}
