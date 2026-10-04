import { NextResponse, type NextRequest } from "next/server";

import { loadPublicBuildStoryBySlug } from "@/lib/vehicles/build-story";
import {
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/api-guard";
import { clientIpFromHeaders, rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/public/build-story?slug=&offset=&limit=
 * Public Build Story pagination (anon-safe via RPC gates).
 */
export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "apiDefault", "build-story");
  if (limited) return limited;

  const slug = request.nextUrl.searchParams.get("slug")?.trim() ?? "";
  if (!slug) {
    return NextResponse.json(
      { ok: false, error: "slug_required" },
      { status: 400 },
    );
  }

  const ip = clientIpFromHeaders(request.headers);
  const perIp = await rateLimit({
    key: `public-build-story:${ip}:${slug}`,
    limit: RATE_LIMITS.apiDefault.limit,
    windowMs: RATE_LIMITS.apiDefault.windowMs,
  });
  if (!perIp.ok) {
    return rateLimitResponse(perIp);
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const offsetParam = request.nextUrl.searchParams.get("offset");
  const limit =
    limitParam != null ? Math.min(24, Math.max(1, Number(limitParam) || 12)) : 12;
  const offset =
    offsetParam != null ? Math.max(0, Number(offsetParam) || 0) : 0;

  try {
    const page = await loadPublicBuildStoryBySlug(slug, { limit, offset });
    if (!page) {
      return NextResponse.json({ ok: true, entries: [], hasMore: false });
    }
    return NextResponse.json({
      ok: true,
      entries: page.entries,
      hasMore: page.hasMore,
      vehicleId: page.vehicleId,
    });
  } catch (error) {
    console.error("[public/build-story]", error);
    return NextResponse.json(
      { ok: false, error: "story_load_failed" },
      { status: 500 },
    );
  }
}
