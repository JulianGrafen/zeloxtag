import { NextResponse } from "next/server";

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
 */
export async function GET() {
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
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    if (!data?.uuid) {
      return NextResponse.json({
        ok: true,
        uuid: null,
        source: "empty",
      });
    }

    return NextResponse.json({
      ok: true,
      uuid: data.uuid,
      source: "supabase",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Lookup failed",
      },
      { status: 500 },
    );
  }
}
