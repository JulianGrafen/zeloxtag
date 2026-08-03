import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Session cookie defaults for `@supabase/ssr`.
 * HttpOnly is enforced on the server/proxy `setAll` path so tokens stay
 * out of `document.cookie`. SameSite=Lax mitigates CSRF on top-level navigations;
 * Secure is required in production (HTTPS).
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
    httpOnly: hardened.httpOnly,
  };
}
