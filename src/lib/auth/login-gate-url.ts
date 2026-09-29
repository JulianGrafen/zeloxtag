import {
  isGenericPostLoginNext,
  sanitizePostLoginPath,
} from "@/lib/auth/post-login-path-guards";

/** Canonical login entry with preserved deep link (`/` hosts LoginForm). */
export function loginGateHref(nextPath: string): string {
  const safe = sanitizePostLoginPath(nextPath.trim() || "/auth/continue");
  return `/?next=${encodeURIComponent(safe)}`;
}

/**
 * After password or MFA login: full navigation via `/auth/continue` so session
 * cookies are visible on the next request (avoids garage deep-link loops).
 */
export function postPasswordLoginHref(targetPath: string): string {
  const safe = sanitizePostLoginPath(targetPath.trim() || "/auth/continue");
  if (isGenericPostLoginNext(safe)) {
    return "/auth/continue";
  }
  return `/auth/continue?next=${encodeURIComponent(safe)}`;
}
