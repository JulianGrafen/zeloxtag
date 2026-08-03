import { NextResponse, type NextRequest } from "next/server";

import { enforceRateLimit } from "@/lib/security/api-guard";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";

export const runtime = "nodejs";

/**
 * GET /api/tags/next-unclaimed
 * Latest unclaimed tag UUID for QR / inventory testing.
 *
 * Public (rate-limited): always falls back to the local mock UUID so `/qr`
 * keeps working without a session. Live Supabase lookup runs when configured.
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "apiDefault", "next-unclaimed");
  if (limited) return limited;

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured || !isSupabaseAdminConfigured()) {
    return NextResponse.json({
      ok: true,
      uuid: MOCK_TAG_UUIDS.unclaimed,
      source: "mock",
    });
  }

  try {
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
      return NextResponse.json({
        ok: true,
        uuid: MOCK_TAG_UUIDS.unclaimed,
        source: "mock",
        warning: error.message,
      });
    }

    if (!data?.uuid) {
      return NextResponse.json({
        ok: true,
        uuid: MOCK_TAG_UUIDS.unclaimed,
        source: "empty-fallback-mock",
      });
    }

    return NextResponse.json({
      ok: true,
      uuid: data.uuid,
      source: "supabase",
    });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      uuid: MOCK_TAG_UUIDS.unclaimed,
      source: "mock",
      warning: error instanceof Error ? error.message : "Lookup failed",
    });
  }
}
