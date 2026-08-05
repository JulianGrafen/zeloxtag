/**
 * Browser Supabase client is intentionally not provided.
 *
 * Auth sessions must be written only via Server Actions / Route Handlers /
 * Proxy (`createServerClient` + `hardenCookieOptions`) so cookies stay
 * HttpOnly. `createBrowserClient` falls back to `document.cookie`, which
 * cannot set HttpOnly and would expose access/refresh tokens to XSS.
 *
 * Use `@/lib/supabase/server` (RSC / actions) or `@/lib/supabase/route`
 * (Route Handlers) instead.
 */

export function createClient(): never {
  throw new Error(
    "Browser Supabase client is disabled. Use server actions / route handlers so auth cookies remain HttpOnly.",
  );
}
