import { NextResponse, type NextRequest } from "next/server";

import {
  applyStripeMembershipAction,
  recordStripeWebhookEvent,
} from "@/lib/billing/membership-store";
import { getStripe, stripeEnv } from "@/lib/billing/stripe";
import { parseStripeMembershipAction } from "@/lib/billing/stripe-membership";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

/**
 * POST /api/stripe/webhook — verify Stripe-Signature on the raw body, then
 * grant/revoke ZeloxTag Cloud membership.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { webhookSecret, secretKey } = stripeEnv();
  if (!webhookSecret || !secretKey) {
    return json(503, { ok: false, error: "Stripe webhook is not configured." });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return json(400, { ok: false, error: "Missing Stripe-Signature." });
  }

  let event: { id: string; type: string; data: { object: unknown } };
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    ) as typeof event;
  } catch {
    return json(400, { ok: false, error: "Invalid Stripe signature." });
  }

  const action = parseStripeMembershipAction(event.type, event.data.object);
  if (!action) {
    return json(200, { ok: true, ignored: true, type: event.type });
  }

  if (!isSupabaseAdminConfigured()) {
    return json(503, { ok: false, error: "Supabase is not configured." });
  }

  try {
    await applyStripeMembershipAction(action);
    await recordStripeWebhookEvent(event.id, event.type);
    return json(200, { ok: true, type: event.type, status: action.status });
  } catch (error) {
    console.error("[stripe-webhook] apply failed", error);
    return json(500, { ok: false, error: "Membership update failed." });
  }
}
