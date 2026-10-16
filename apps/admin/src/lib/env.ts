/**
 * Typed access to Vite env vars. Values are read lazily so the app can still
 * boot (e.g. with VITE_DEV_BYPASS_AUTH) before keys are configured; the first
 * real use of a missing value throws a clear error instead of failing silently.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing env var ${name}. Copy apps/admin/.env.example to apps/admin/.env and fill it in.`,
    )
  }
  return value
}

export const env = {
  get supabaseUrl(): string {
    return required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL)
  },
  get supabaseAnonKey(): string {
    return required('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY)
  },
  get mlApiUrl(): string {
    return required('VITE_ML_API_URL', import.meta.env.VITE_ML_API_URL)
  },
  /** Dev-only escape hatch: skip the admin sign-in gate. Never enable in a deployed build. */
  devBypassAuth: import.meta.env.VITE_DEV_BYPASS_AUTH === 'true',
  /** True when Supabase keys are present, so callers can show a setup hint instead of crashing. */
  hasSupabase: Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
}
