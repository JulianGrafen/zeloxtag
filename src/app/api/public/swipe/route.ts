import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { registerAnonymousSwipe } from "@/lib/public-swipe/load-public-swipe-cards";
import { enforceRateLimit } from "@/lib/security/api-guard";
import {
  authClientKeyFromHeaders,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  vehicleId: z.string().uuid(),
  voteType: z.enum(["up", "down"]),
  clientSessionHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "publicSwipe", "vote");
  if (limited) return limited;

  const clientKey = authClientKeyFromHeaders(request.headers);
  const perClient = await rateLimit({
    key: `public-swipe-vote:${clientKey}`,
    limit: RATE_LIMITS.publicSwipe.limit,
    windowMs: RATE_LIMITS.publicSwipe.windowMs,
  });
  if (!perClient.ok) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen.", code: "rate_limited" },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungültiger Request." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Ungültige Swipe-Daten." },
      { status: 400 },
    );
  }

  try {
    const result = await registerAnonymousSwipe(parsed.data);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[public/swipe]", error);
    return NextResponse.json(
      { ok: false, error: "Swipe konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
