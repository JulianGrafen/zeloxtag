import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  RATE_LIMITS,
  authClientKeyFromHeaders,
  rateLimit,
} from "@/lib/security/rate-limit";
import { castShowcaseVote, voterHashForUser } from "@/lib/showcase/showcase-votes";
import { isLikelyBotUserAgent } from "@/lib/tags/tag-scan-notify";

export const runtime = "nodejs";

const bodySchema = z.object({
  vehicleId: z.string().uuid(),
  /** sha256 of the anonymous browser session (same as Build-Swipe). */
  sessionHash: z.string().regex(/^[a-f0-9]{64}$/),
});

/** POST /api/public/showcase-vote — one vote per visitor per vehicle. */
export async function POST(request: NextRequest) {
  if (isLikelyBotUserAgent(request.headers.get("user-agent"))) {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 });
  }

  const clientKey = authClientKeyFromHeaders(request.headers);
  const limited = await rateLimit({
    key: `showcase-vote:${clientKey}`,
    limit: RATE_LIMITS.publicSwipe.limit,
    windowMs: RATE_LIMITS.publicSwipe.windowMs,
  });
  if (!limited.ok) {
    return NextResponse.json({ error: "Zu viele Votes. Kurz warten." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const user = await getCurrentUser().catch(() => null);
  const result = await castShowcaseVote({
    vehicleId: parsed.data.vehicleId,
    voterHash: user ? voterHashForUser(user.id) : parsed.data.sessionHash,
    userId: user?.id ?? null,
  });

  if (result.status === "error") {
    return NextResponse.json({ error: "Vote fehlgeschlagen." }, { status: 500 });
  }
  if (result.status === "own_vehicle") {
    return NextResponse.json(
      { error: "Für dein eigenes Auto kannst du nicht voten.", total: result.total },
      { status: 403 },
    );
  }
  return NextResponse.json({ total: result.total, alreadyVoted: result.alreadyVoted });
}
