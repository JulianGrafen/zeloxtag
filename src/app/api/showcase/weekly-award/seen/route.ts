import { NextResponse, type NextRequest } from "next/server";

import { markWeeklyRankAwardSeen } from "@/lib/showcase/load-weekly-rank-award";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireWritableApiUser,
} from "@/lib/security/api-guard";

export const runtime = "nodejs";

/** POST /api/showcase/weekly-award/seen — dismiss in-app weekly rank celebration. */
export async function POST(request: NextRequest) {
  const originBlock = enforceSameOrigin(request);
  if (originBlock) return originBlock;

  const limited = await enforceRateLimit(request, "showcaseSwipe", "weekly-award-seen");
  if (limited) return limited;

  const auth = await requireWritableApiUser();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger Body." }, { status: 400 });
  }

  const awardId =
    body && typeof body === "object" && typeof (body as { awardId?: unknown }).awardId === "string"
      ? (body as { awardId: string }).awardId.trim()
      : "";

  if (!awardId) {
    return NextResponse.json({ ok: false, error: "awardId fehlt." }, { status: 400 });
  }

  const result = await markWeeklyRankAwardSeen(auth.user.id, awardId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
