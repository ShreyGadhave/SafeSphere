import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import type { Database } from '@/types/database.types'

export type TypedSupabaseClient = SupabaseClient<Database>

let client: TypedSupabaseClient | null = null

/** Shared, typed Supabase client, created on first use so a missing key fails with a clear message. */
export function getSupabase(): TypedSupabaseClient {
  if (!client) {
    client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  }
  return client
}
