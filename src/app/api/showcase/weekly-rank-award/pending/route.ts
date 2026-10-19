import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/security/api-guard";
import { loadPendingWeeklyRankAwardForUser } from "@/lib/showcase/load-weekly-rank-award";
import { resolveWeeklyRankEntdeckenHref } from "@/lib/showcase/resolve-weekly-rank-entdecken-href";
import { weeklyRankAwardHeadline } from "@/lib/showcase/weekly-rank-award-keys";

export const runtime = "nodejs";

/** GET — pending weekly rank award for in-app toast (auth). */
export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  try {
    const celebration = await loadPendingWeeklyRankAwardForUser(auth.user.id);
    if (!celebration) {
      return NextResponse.json({ ok: true, pending: null });
    }

    const entdeckenHref = await resolveWeeklyRankEntdeckenHref(
      celebration.award.vehicleId,
    );
    const headline = weeklyRankAwardHeadline(celebration.award.rank);

    return NextResponse.json({
      ok: true,
      pending: {
        awardId: celebration.award.id,
        rank: celebration.award.rank,
        weeklyLikes: celebration.award.weeklyLikes,
        headline,
        entdeckenHref: `${entdeckenHref}${entdeckenHref.includes("?") ? "&" : "?"}weeklyAward=1`,
      },
    });
  } catch (error) {
    console.error("[weekly-rank-award/pending]", error);
    return NextResponse.json(
      { ok: false, error: "Award konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}
