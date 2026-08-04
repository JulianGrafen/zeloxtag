import { NextResponse, type NextRequest } from "next/server";

import { enforceRateLimit } from "@/lib/security/api-guard";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createUnclaimedTag } from "@/lib/tags/create-unclaimed-tag";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";

export const runtime = "nodejs";

type NextUnclaimedBody = {
  ok: true;
  uuid: string;
  source: "supabase" | "minted" | "mock" | "empty-fallback-mock";
  warning?: string;
};

/**
 * GET /api/tags/next-unclaimed
 * Latest unclaimed tag UUID for the online QR generator (`/qr` on Vercel).
 *
 * When the inventory is empty and the service role is configured, mints a
 * fresh unclaimed tag so production QR generation never falls back to demo IDs.
 * Pass `?mint=1` to always create a new plaque UUID (inventory tooling).
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "apiDefault", "next-unclaimed");
  if (limited) return limited;

  const forceMint = request.nextUrl.searchParams.get("mint") === "1";
  const { isConfigured } = getSupabaseEnv();

  if (!isConfigured || !isSupabaseAdminConfigured()) {
    const body: NextUnclaimedBody = {
      ok: true,
      uuid: MOCK_TAG_UUIDS.unclaimed,
      source: "mock",
      warning:
        "Supabase Admin fehlt — Demo-UUID. Auf Vercel SUPABASE_SERVICE_ROLE_KEY setzen.",
    };
    return NextResponse.json(body);
  }

  try {
    if (forceMint) {
      const minted = await createUnclaimedTag();
      const body: NextUnclaimedBody = {
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
      const body: NextUnclaimedBody = {
        ok: true,
        uuid: MOCK_TAG_UUIDS.unclaimed,
        source: "mock",
        warning: error.message,
      };
      return NextResponse.json(body);
    }

    if (data?.uuid) {
      const body: NextUnclaimedBody = {
        ok: true,
        uuid: data.uuid,
        source: "supabase",
      };
      return NextResponse.json(body);
    }

    // Empty inventory → mint so Vercel `/qr` always has a live target.
    const minted = await createUnclaimedTag();
    const body: NextUnclaimedBody = {
      ok: true,
      uuid: minted.uuid,
      source: "minted",
    };
    return NextResponse.json(body);
  } catch (error) {
    const body: NextUnclaimedBody = {
      ok: true,
      uuid: MOCK_TAG_UUIDS.unclaimed,
      source: "mock",
      warning: error instanceof Error ? error.message : "Lookup failed",
    };
    return NextResponse.json(body);
  }
}
