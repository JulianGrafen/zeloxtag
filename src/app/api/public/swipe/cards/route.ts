import { NextResponse, type NextRequest } from "next/server";

import { loadPublicSwipeCards } from "@/lib/public-swipe/load-public-swipe-cards";
import { enforceRateLimit } from "@/lib/security/api-guard";
import {
  authClientKeyFromHeaders,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";

export const runtime = "nodejs";

function parseExcludeIds(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 100);
}

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "publicSwipe", "cards");
  if (limited) return limited;

  const clientKey = authClientKeyFromHeaders(request.headers);
  const perClient = await rateLimit({
    key: `public-swipe-cards:${clientKey}`,
    limit: RATE_LIMITS.publicSwipe.limit,
    windowMs: RATE_LIMITS.publicSwipe.windowMs,
  });
  if (!perClient.ok) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen.", code: "rate_limited" },
      { status: 429 },
    );
  }

  const excludeIds = parseExcludeIds(
    request.nextUrl.searchParams.get("excludeIds"),
  );
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit =
    limitParam != null ? Math.min(20, Math.max(1, Number(limitParam) || 10)) : 10;
  const sessionHashRaw = request.nextUrl.searchParams.get("sessionHash")?.trim();
  const clientSessionHash =
    sessionHashRaw && /^[a-f0-9]{64}$/.test(sessionHashRaw)
      ? sessionHashRaw
      : null;

  try {
    const cards = await loadPublicSwipeCards({
      excludeVehicleIds: excludeIds,
      limit,
      clientSessionHash,
    });
    return NextResponse.json({ ok: true, cards });
  } catch (error) {
    console.error("[public/swipe/cards]", error);
    return NextResponse.json(
      { ok: false, error: "Karten konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}
