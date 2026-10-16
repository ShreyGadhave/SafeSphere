/**
 * Public runtime config. Expo inlines EXPO_PUBLIC_* variables from apps/mobile/.env
 * at build time, so they must be referenced with the full literal name below.
 * Never put secrets here: anything EXPO_PUBLIC_ ships inside the APK.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name}. Copy apps/mobile/.env.example to apps/mobile/.env and fill it in.`);
  }
  return value;
}

export const env = {
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  /** FastAPI ML service. Optional until Phase 2; features that need it degrade gracefully. */
  mlApiUrl: process.env.EXPO_PUBLIC_ML_API_URL ?? null,
} as const;
