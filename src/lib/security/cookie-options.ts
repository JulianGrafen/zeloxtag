import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Session cookie defaults for `@supabase/ssr`.
 *
 * Always HttpOnly — `@supabase/ssr` defaults `httpOnly: false` so clients
 * can use `document.cookie`; we override on every server/proxy/route `setAll`
 * so access/refresh tokens are never readable from JavaScript.
 * SameSite=Lax mitigates CSRF on top-level navigations; Secure in production.
 */
export function authCookieOptions(): CookieOptionsWithName {
  const isProd = process.env.NODE_ENV === "production";
  return {
    path: "/",
    sameSite: "lax",
    secure: isProd,
    httpOnly: true,
  };
}

/** Merge Supabase-provided options with our hardened defaults (server wins). */
export function hardenCookieOptions<T extends Record<string, unknown>>(
  options?: T,
): T & CookieOptionsWithName {
  const hardened = authCookieOptions();
  return {
    ...(options ?? ({} as T)),
    path: hardened.path,
    sameSite: hardened.sameSite,
    secure: hardened.secure,
    httpOnly: true,
  };
}
