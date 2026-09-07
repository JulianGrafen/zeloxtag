import { NextResponse, type NextRequest } from "next/server";

import { buildAccountArchiveZip } from "@/lib/account/export-account-archive";
import { getCurrentUser } from "@/lib/auth/get-user";
import {
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/api-guard";
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * GET /api/account/export
 * ZIP export of all account data — only during deletion grace period.
 */
export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "apiDefault", "account-export");
  if (limited) return limited;

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return NextResponse.json(
      { ok: false, error: "Supabase ist nicht konfiguriert." },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Authentication required." },
      { status: 401 },
    );
  }

  const exportLimit = await rateLimit({
    key: `account-export:${user.id}`,
    limit: RATE_LIMITS.accountExport.limit,
    windowMs: RATE_LIMITS.accountExport.windowMs,
  });
  if (!exportLimit.ok) {
    return rateLimitResponse(exportLimit);
  }

  const result = await buildAccountArchiveZip(user.id);
  if (!result.ok) {
    const status =
      result.code === "not_in_grace"
        ? 403
        : result.code === "unconfigured"
          ? 503
          : 500;
    return NextResponse.json({ ok: false, error: result.message }, { status });
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
