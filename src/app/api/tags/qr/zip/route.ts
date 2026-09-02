import { NextResponse, type NextRequest } from "next/server";

import { requireOperator } from "@/lib/auth/require-operator";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/api-guard";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { MAX_MINT_BATCH } from "@/lib/tags/mint-batch";
import {
  isPlaqueTagUuid,
  plaqueProductionOrigin,
  plaqueScanUrl,
  plaqueSvgFilename,
  renderPlaqueQrSvg,
} from "@/lib/tags/plaque-qr";
import { createStoreZip } from "@/lib/zip/store-zip";

export const runtime = "nodejs";

function parseUuidList(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MINT_BATCH) {
    return null;
  }
  const uuids: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !isPlaqueTagUuid(item)) return null;
    uuids.push(item.trim());
  }
  return uuids;
}

function zipFilename(count: number): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `zeloxtag-mint-${count}-${stamp}.zip`;
}

/**
 * POST /api/tags/qr/zip
 * Superuser-only batch SVG download as a single ZIP archive.
 * Body: `{ "uuids": ["…", "…"] }` (max 25)
 */
export async function POST(request: NextRequest) {
  const originBlocked = enforceSameOrigin(request);
  if (originBlocked) return originBlocked;

  const limited = await enforceRateLimit(request, "tagMint", "qr-zip");
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

  const uuids = parseUuidList(
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
  const entries = await Promise.all(
    uuids.map(async (uuid) => {
      const svg = await renderPlaqueQrSvg(plaqueScanUrl(scanOrigin, uuid));
      return { name: plaqueSvgFilename(uuid), data: svg };
    }),
  );

  const zip = createStoreZip(entries);
  const filename = zipFilename(uuids.length);

  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
