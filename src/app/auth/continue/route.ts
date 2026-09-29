import { NextResponse, type NextRequest } from "next/server";

import { loginGateHref } from "@/lib/auth/login-gate-url";
import {
  isGenericPostLoginNext,
  sanitizePostLoginPath,
} from "@/lib/auth/post-login-path-guards";
import { resolveAuthenticatedDestination } from "@/lib/auth/resolve-authenticated-destination";
import { createClient } from "@/lib/supabase/server";

/** Absolute redirect using the request Host (ZAP/Docker uses host.docker.internal). */
function redirectToPath(request: NextRequest, path: string): NextResponse {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host && path.startsWith("/")) {
    const hostname = host.split(":")[0] ?? host;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "host.docker.internal" ||
      hostname.endsWith(".local");
    const proto =
      request.headers.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
    return NextResponse.redirect(new URL(path, `${proto}://${host}`));
  }
  return NextResponse.redirect(new URL(path, request.url));
}

/**
 * Post-auth hop: resolve the owner's vehicle dashboard on a fresh request
 * (cookies already committed). Not rate-limited — brute-force protection
 * lives on password/MFA routes; this only redirects signed-in users.
 */
async function handleContinue(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const nextRaw = request.nextUrl.searchParams.get("next");
    const intended =
      nextRaw?.trim() && !isGenericPostLoginNext(nextRaw)
        ? sanitizePostLoginPath(nextRaw)
        : "/auth/continue";
    const login = new URL(loginGateHref(intended), request.url);
    login.searchParams.set("error", "session");
    return NextResponse.redirect(login);
  }

  const nextRaw = request.nextUrl.searchParams.get("next");
  if (nextRaw?.trim()) {
    const safe = sanitizePostLoginPath(nextRaw);
    if (!isGenericPostLoginNext(safe)) {
      return redirectToPath(request, safe);
    }
  }

  const destination = await resolveAuthenticatedDestination(user.id);
  if (destination.status === "error") {
    const login = new URL("/login", request.url);
    login.searchParams.set("error", destination.message);
    return NextResponse.redirect(login);
  }

  const href = destination.href;
  if (href.startsWith("/")) {
    return redirectToPath(request, href);
  }
  return NextResponse.redirect(new URL(href, request.url));
}

/** POST can follow 307 redirects from login; treat like GET. */
export async function GET(request: NextRequest) {
  return handleContinue(request);
}

export async function POST(request: NextRequest) {
  return handleContinue(request);
}
