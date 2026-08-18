import { NextResponse, type NextRequest } from "next/server";

import { requireOperator } from "@/lib/auth/require-operator";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/api-guard";
import { getSupabaseEnvDiagnostics } from "@/lib/supabase/env";
import {
  createUnclaimedTags,
  parseMintCount,
} from "@/lib/tags/create-unclaimed-tag";

export const runtime = "nodejs";

/**
 * POST /api/tags/mint
 * Superuser-only batch mint for steel QR plaques.
 * Body: `{ "count": 1-20 }`
 */
export async function POST(request: NextRequest) {
  const originBlocked = enforceSameOrigin(request);
  if (originBlocked) return originBlocked;

  const limited = await enforceRateLimit(request, "tagMint", "mint");
  if (limited) return limited;

  const operator = await requireOperator();
  if (!operator.ok) {
    return NextResponse.json(
      { ok: false, error: operator.message },
      { status: operator.status },
    );
  }

  const diagnostics = getSupabaseEnvDiagnostics();
  if (!diagnostics.isAdminConfigured) {
    return NextResponse.json(
      { ok: false, error: "Dokument-/Tag-Service ist nicht konfiguriert." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungültiges JSON." },
      { status: 400 },
    );
  }

  const count = parseMintCount(
    body && typeof body === "object" && "count" in body
      ? (body as { count: unknown }).count
      : 1,
  );
  if (!count) {
    return NextResponse.json(
      { ok: false, error: "Anzahl muss zwischen 1 und 20 liegen." },
      { status: 400 },
    );
  }

  try {
    const tags = await createUnclaimedTags(count);
    return NextResponse.json({
      ok: true,
      tags: tags.map((tag) => ({ uuid: tag.uuid })),
    });
  } catch (error) {
    console.error("[tags/mint] failed", error);
    return NextResponse.json(
      { ok: false, error: "Tags konnten nicht gemintet werden." },
      { status: 500 },
    );
  }
}
