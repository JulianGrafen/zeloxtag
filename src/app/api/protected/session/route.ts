import { NextResponse, type NextRequest } from "next/server";

import { enforceRateLimit, requireApiUser } from "@/lib/security/api-guard";

export const runtime = "nodejs";

/**
 * GET /api/protected/session
 * Authenticated session probe under the Zero-Trust `/api/protected` namespace.
 * Proxy rejects anonymous callers before this handler runs.
 */
export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(
    request,
    "apiDefault",
    "protected-session",
  );
  if (limited) return limited;

  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    ok: true as const,
    userId: auth.user.id,
    email: auth.user.email ?? null,
  });
}
