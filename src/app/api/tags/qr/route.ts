import { NextResponse, type NextRequest } from "next/server";

import { requireOperator } from "@/lib/auth/require-operator";
import { enforceRateLimit } from "@/lib/security/api-guard";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  isPlaqueTagUuid,
  plaqueScanUrl,
  plaqueSvgFilename,
  renderPlaqueQrSvg,
} from "@/lib/tags/plaque-qr";

export const runtime = "nodejs";

function plaqueOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (
    configured &&
    !configured.includes("localhost") &&
    !configured.includes("127.0.0.1")
  ) {
    return configured;
  }
  return "https://app.zeloxtag.de";
}

/**
 * GET /api/tags/qr?uuid=
 * Superuser-only SVG download for laser-engraved plaques.
 */
export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "tagMint", "qr-svg");
  if (limited) return limited;

  const operator = await requireOperator();
  if (!operator.ok) {
    return NextResponse.json(
      { ok: false, error: operator.message },
      { status: operator.status },
    );
  }

  const uuid = request.nextUrl.searchParams.get("uuid")?.trim() ?? "";
  if (!isPlaqueTagUuid(uuid)) {
    return NextResponse.json(
      { ok: false, error: "Ungültige Tag-UUID." },
      { status: 400 },
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Dokument-/Tag-Service ist nicht konfiguriert." },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tags")
    .select("uuid")
    .eq("uuid", uuid)
    .maybeSingle();
  if (error || !data?.uuid) {
    return NextResponse.json(
      { ok: false, error: "Tag nicht gefunden." },
      { status: 404 },
    );
  }

  const scanUrl = plaqueScanUrl(plaqueOrigin(), data.uuid);
  const svg = await renderPlaqueQrSvg(scanUrl);
  const filename = plaqueSvgFilename(data.uuid);

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
