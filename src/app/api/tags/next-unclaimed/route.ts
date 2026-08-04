import { NextResponse, type NextRequest } from "next/server";

import { enforceRateLimit, requireApiUser } from "@/lib/security/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnvDiagnostics } from "@/lib/supabase/env";
import { createUnclaimedTag } from "@/lib/tags/create-unclaimed-tag";

export const runtime = "nodejs";

type NextUnclaimedOk = {
  ok: true;
  uuid: string;
  source: "supabase" | "minted";
};

type NextUnclaimedErr = {
  ok: false;
  error: string;
  source: "config" | "supabase" | "unauthorized";
};

/**
 * GET /api/tags/next-unclaimed
 * Inventory helper for authenticated operators only (service-role mint).
 * Pass `?mint=1` to always create a new plaque UUID.
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "auth", "next-unclaimed");
  if (limited) return limited;

  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const forceMint = request.nextUrl.searchParams.get("mint") === "1";
  const diagnostics = getSupabaseEnvDiagnostics();

  if (!diagnostics.isAdminConfigured) {
    const body: NextUnclaimedErr = {
      ok: false,
      source: "config",
      error: "Dokument-/Tag-Service ist nicht konfiguriert.",
    };
    return NextResponse.json(body, { status: 503 });
  }

  try {
    if (forceMint) {
      const minted = await createUnclaimedTag();
      const body: NextUnclaimedOk = {
        ok: true,
        uuid: minted.uuid,
        source: "minted",
      };
      return NextResponse.json(body);
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("tags")
      .select("uuid, created_at")
      .eq("status", "unclaimed")
      .is("vehicle_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      const body: NextUnclaimedErr = {
        ok: false,
        source: "supabase",
        error: "Tag-Lookup fehlgeschlagen.",
      };
      return NextResponse.json(body, { status: 500 });
    }

    if (data?.uuid) {
      const body: NextUnclaimedOk = {
        ok: true,
        uuid: data.uuid,
        source: "supabase",
      };
      return NextResponse.json(body);
    }

    const minted = await createUnclaimedTag();
    const body: NextUnclaimedOk = {
      ok: true,
      uuid: minted.uuid,
      source: "minted",
    };
    return NextResponse.json(body);
  } catch {
    const body: NextUnclaimedErr = {
      ok: false,
      source: "supabase",
      error: "Tag konnte nicht erzeugt werden.",
    };
    return NextResponse.json(body, { status: 500 });
  }
}
