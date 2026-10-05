import "server-only";

import { loginGateHref } from "@/lib/auth/login-gate-url";
import { finalizePostLoginPath } from "@/lib/auth/post-login-path";
import {
  isGenericPostLoginNext,
  sanitizePostLoginPath,
} from "@/lib/auth/post-login-path-guards";
import { resolveAuthenticatedDestination } from "@/lib/auth/resolve-authenticated-destination";

function loginGateWithError(nextPath: string, error: string): string {
  const gate = loginGateHref(nextPath);
  const url = new URL(gate, "https://app.zeloxtag.de");
  url.searchParams.set("error", error);
  return `${url.pathname}${url.search}`;
}

/**
 * Target path after `/auth/continue` (route handler).
 * Returns an in-app path starting with `/`.
 */
export async function resolveAuthContinueHref(
  userId: string | null | undefined,
  nextRaw?: string | null,
): Promise<string> {
  if (!userId) {
    const intended =
      nextRaw?.trim() && !isGenericPostLoginNext(nextRaw)
        ? sanitizePostLoginPath(nextRaw)
        : "/auth/continue";
    return loginGateWithError(intended, "session");
  }

  if (nextRaw?.trim()) {
    const safe = sanitizePostLoginPath(nextRaw);
    if (!isGenericPostLoginNext(safe)) {
      return await finalizePostLoginPath(userId, safe);
    }
  }

  const destination = await resolveAuthenticatedDestination(userId);
  if (destination.status === "error") {
    return loginGateWithError("/auth/continue", destination.message);
  }

  return destination.href.startsWith("/")
    ? destination.href
    : sanitizePostLoginPath(destination.href);
}
