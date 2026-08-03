/**
 * Shared env validation for Supabase clients.
 * Missing values are allowed in local demo mode (mock tag lookup).
 */

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    url: url ?? "",
    anonKey: anonKey ?? "",
    isConfigured: Boolean(url && anonKey),
  };
}
