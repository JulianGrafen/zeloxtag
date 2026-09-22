import { NextResponse, type NextRequest } from "next/server";

import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import { markShowcaseLikesSeen } from "@/lib/showcase/swipe-record";

export const runtime = "nodejs";

/**
 * POST /api/showcase/swipe/inbox/seen
 * Body: { vehicleId?: string } — omit to mark all owned vehicles seen.
 */
export async function POST(request: NextRequest) {
  const originBlock = enforceSameOrigin(request);
  if (originBlock) return originBlock;

  const limited = await enforceRateLimit(request, "apiDefault", "swipe-inbox-seen");
  if (limited) return limited;

  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungültiger Request-Body." },
      { status: 400 },
    );
  }

  const vehicleId =
    body && typeof body === "object" && "vehicleId" in body
      ? (body as { vehicleId?: unknown }).vehicleId
      : undefined;

  const result = await markShowcaseLikesSeen({
    vehicleId: typeof vehicleId === "string" ? vehicleId : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true });
}
