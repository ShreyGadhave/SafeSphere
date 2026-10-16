/** Readable message from a Supabase/PostgREST error, a thrown Error or anything else. */
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message)
  return 'Something went wrong.'
}
