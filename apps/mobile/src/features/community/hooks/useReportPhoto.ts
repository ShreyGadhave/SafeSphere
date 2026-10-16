import { useQuery } from '@tanstack/react-query';

import { mediaUrl } from '../services/communityApi';

/** Signed URL for a report's photo. Shared by the feed thumbnail and the detail screen (same cache entry). */
export function useReportPhoto(mediaPath: string | null | undefined) {
  return useQuery({
    queryKey: ['reportMedia', mediaPath],
    queryFn: () => mediaUrl(mediaPath!),
    enabled: !!mediaPath,
    // Signed URLs live for an hour; refresh well before they expire.
    staleTime: 45 * 60_000,
  });
}
