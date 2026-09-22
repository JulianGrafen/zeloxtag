import { NextResponse, type NextRequest } from "next/server";

import { requireOperator } from "@/lib/auth/require-operator";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/api-guard";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  buildMintPlaqueExcelBuffer,
  mintPlaqueExcelFilename,
} from "@/lib/tags/mint-plaque-excel";
import { MAX_MINT_BATCH } from "@/lib/tags/mint-batch";
import { parseMintPlaqueUuidList } from "@/lib/tags/parse-mint-plaque-uuids";
import { plaqueProductionOrigin } from "@/lib/tags/plaque-qr";

export const runtime = "nodejs";

/**
 * POST /api/tags/qr/excel
 * Superuser-only Excel export (ZELOX Tags sheet with scan URLs and QR previews).
 * Body: `{ "uuids": ["…", "…"] }` (max 50)
 */
export async function POST(request: NextRequest) {
  const originBlocked = enforceSameOrigin(request);
  if (originBlocked) return originBlocked;

  const limited = await enforceRateLimit(request, "tagMint", "qr-excel");
  if (limited) return limited;

  const operator = await requireOperator();
  if (!operator.ok) {
    return NextResponse.json(
      { ok: false, error: operator.message },
      { status: operator.status },
    );
  }

  if (!isSupabaseAdminConfigured()) {
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

  const uuids = parseMintPlaqueUuidList(
    body && typeof body === "object" && "uuids" in body
      ? (body as { uuids: unknown }).uuids
      : null,
  );
  if (!uuids) {
    return NextResponse.json(
      {
        ok: false,
        error: `Es werden 1–${MAX_MINT_BATCH} gültige Tag-UUIDs benötigt.`,
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tags")
    .select("uuid")
    .in("uuid", uuids);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Tags konnten nicht geladen werden." },
      { status: 500 },
    );
  }

  const found = new Set((data ?? []).map((row) => row.uuid));
  if (found.size !== uuids.length) {
    return NextResponse.json(
      { ok: false, error: "Mindestens ein Tag wurde nicht gefunden." },
      { status: 404 },
    );
  }

  const scanOrigin = plaqueProductionOrigin();
  const xlsx = await buildMintPlaqueExcelBuffer(uuids, { scanOrigin });
  const filename = mintPlaqueExcelFilename();

  return new NextResponse(new Uint8Array(xlsx), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
