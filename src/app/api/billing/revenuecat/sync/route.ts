import { NextResponse, type NextRequest } from "next/server";

import { applyRevenueCatSubscriberSnapshot } from "@/lib/billing/membership-store";
import { fetchRevenueCatSubscriber } from "@/lib/billing/revenuecat-server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { enforceRateLimit } from "@/lib/security/api-guard";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

/** POST /api/billing/revenuecat/sync — reconcile RC subscriber → memberships (after purchase/restore). */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const limited = await enforceRateLimit(
    request,
    "stripeCheckout",
    "revenuecat-sync",
  );
  if (limited) {
    return limited;
  }

  const user = await getCurrentUser();
  if (!user) {
    return json(401, { ok: false, error: "Unauthorized." });
  }

  if (!isSupabaseAdminConfigured()) {
    return json(503, { ok: false, error: "Supabase is not configured." });
  }

  const snapshot = await fetchRevenueCatSubscriber(user.id);
  if (!snapshot) {
    return json(503, { ok: false, error: "RevenueCat sync is not configured." });
  }

  try {
    await applyRevenueCatSubscriberSnapshot(snapshot);
    return json(200, {
      ok: true,
      status: snapshot.status,
      entitled: snapshot.status === "active",
    });
  } catch (error) {
    console.error("[revenuecat-sync] failed", error);
    return json(500, { ok: false, error: "Membership sync failed." });
  }
}
