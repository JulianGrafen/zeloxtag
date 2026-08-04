import { NextResponse, type NextRequest } from "next/server";

import { enforceRateLimit } from "@/lib/security/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnvDiagnostics } from "@/lib/supabase/env";
import { createUnclaimedTag } from "@/lib/tags/create-unclaimed-tag";

export const runtime = "nodejs";

type NextUnclaimedOk = {
  ok: true;
  uuid: string;
  source: "supabase" | "minted";
  warning?: string;
};

type NextUnclaimedErr = {
  ok: false;
  error: string;
  source: "config" | "supabase";
  missingEnv?: string[];
  warning?: string;
};

/**
 * GET /api/tags/next-unclaimed
 * Latest unclaimed tag UUID for the online QR generator (`/qr` on Vercel).
 *
 * Never returns demo/mock UUIDs. Missing admin env or DB errors → 503/500.
 * Pass `?mint=1` to always create a new plaque UUID (inventory tooling).
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "apiDefault", "next-unclaimed");
  if (limited) return limited;

  const forceMint = request.nextUrl.searchParams.get("mint") === "1";
  const diagnostics = getSupabaseEnvDiagnostics();

  if (!diagnostics.isAdminConfigured) {
    const body: NextUnclaimedErr = {
      ok: false,
      source: "config",
      missingEnv: diagnostics.missing,
      error:
        diagnostics.missing.length > 0
          ? `Vercel Env fehlt: ${diagnostics.missing.join(", ")}. In Vercel → Settings → Environment Variables setzen (Production) und Redeploy.`
          : "Supabase Admin fehlt — echte QR-Codes sind nicht möglich.",
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
        error: `Tag-Lookup fehlgeschlagen: ${error.message}`,
        warning: error.message,
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

    // Empty inventory → mint so Vercel `/qr` always has a live target.
    const minted = await createUnclaimedTag();
    const body: NextUnclaimedOk = {
      ok: true,
      uuid: minted.uuid,
      source: "minted",
    };
    return NextResponse.json(body);
  } catch (error) {
    const body: NextUnclaimedErr = {
      ok: false,
      source: "supabase",
      error:
        error instanceof Error
          ? error.message
          : "Tag konnte nicht erzeugt werden.",
    };
    return NextResponse.json(body, { status: 500 });
  }
}
