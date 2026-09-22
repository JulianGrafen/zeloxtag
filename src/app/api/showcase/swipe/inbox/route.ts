import { NextResponse, type NextRequest } from "next/server";

import { enforceRateLimit, requireApiUser } from "@/lib/security/api-guard";
import { loadShowcaseSwipeInboxSummary } from "@/lib/showcase/swipe-deck";

export const runtime = "nodejs";

/**
 * GET /api/showcase/swipe/inbox
 * Like counts per owned vehicle (owner only via RLS-backed RPC).
 */
export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "apiDefault", "swipe-inbox");
  if (limited) return limited;

  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  try {
    const rows = await loadShowcaseSwipeInboxSummary();
    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    console.error("[showcase-swipe/inbox]", error);
    return NextResponse.json(
      { ok: false, error: "Inbox konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}
