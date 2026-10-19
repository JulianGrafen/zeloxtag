import { NextResponse, type NextRequest } from "next/server";

import {
  applyRevenueCatMembershipAction,
  releaseRevenueCatWebhookEvent,
  reserveRevenueCatWebhookEvent,
} from "@/lib/billing/membership-store";
import { parseRevenueCatWebhookBody } from "@/lib/billing/revenuecat-membership";
import { verifyRevenueCatWebhookAuthorization } from "@/lib/billing/revenuecat-server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

/**
 * POST /api/billing/revenuecat/webhook — RevenueCat → memberships (Module 1b).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return json(503, { ok: false, error: "RevenueCat webhook is not configured." });
  }

  const authHeader = request.headers.get("authorization");
  if (!verifyRevenueCatWebhookAuthorization(authHeader, secret)) {
    return json(401, { ok: false, error: "Unauthorized." });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, error: "Invalid JSON." });
  }

  const action = parseRevenueCatWebhookBody(body);
  if (!action) {
    return json(200, { ok: true, ignored: true });
  }

  if (!isSupabaseAdminConfigured()) {
    return json(503, { ok: false, error: "Supabase is not configured." });
  }

  let reserved: "new" | "duplicate" = "new";
  try {
    reserved = await reserveRevenueCatWebhookEvent(
      action.eventId,
      action.eventType,
    );
    if (reserved === "duplicate") {
      return json(200, { ok: true, duplicate: true, type: action.eventType });
    }

    await applyRevenueCatMembershipAction(action);
    return json(200, {
      ok: true,
      type: action.eventType,
      status: action.status,
    });
  } catch (error) {
    if (reserved === "new") {
      await releaseRevenueCatWebhookEvent(action.eventId);
    }
    console.error("[revenuecat-webhook] apply failed", error);
    return json(500, { ok: false, error: "Membership update failed." });
  }
}
