/**
 * Shared env validation for Supabase clients.
 * Missing values are allowed in local demo mode (mock tag lookup).
 */

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getSupabaseEnv() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
  };
}

/** Non-secret diagnostics for deploy misconfiguration (Vercel env checklist). */
export function getSupabaseEnvDiagnostics() {
  const { url, anonKey, isConfigured } = getSupabaseEnv();
  // Prefer canonical name; accept a common typo alias.
  const serviceRoleKey =
    readEnv("SUPABASE_SERVICE_ROLE_KEY") || readEnv("SUPABASE_SERVICE_KEY");

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  return {
    hasUrl: Boolean(url),
    hasAnonKey: Boolean(anonKey),
    hasServiceRoleKey: Boolean(serviceRoleKey),
    isConfigured,
    isAdminConfigured: isConfigured && Boolean(serviceRoleKey),
    missing,
  };
}
