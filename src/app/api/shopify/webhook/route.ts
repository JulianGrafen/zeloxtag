import { NextResponse, type NextRequest } from "next/server";

import { applyShopifyMembershipAction } from "@/lib/billing/membership-store";
import {
  shopMatchesAllowlist,
  verifyShopifyHmac,
} from "@/lib/billing/shopify-hmac";
import {
  parseMembershipProductIds,
  parseShopifyMembershipAction,
} from "@/lib/billing/shopify-membership";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

async function markWebhookProcessed(id: string, topic: string): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  const admin = createAdminClient();
  const { error } = await admin.from("shopify_webhook_events").upsert({
    id,
    topic,
  });
  if (error) {
    console.error("[shopify-webhook] event log failed", error.message);
  }
}

/**
 * POST /api/shopify/webhook — Shopify HMAC, then grant/revoke membership.
 * Topic is in `X-Shopify-Topic`, never in the JSON body.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = env("SHOPIFY_WEBHOOK_SECRET");
  if (!secret) {
    return json(503, { ok: false, error: "Shopify webhook is not configured." });
  }

  const rawBody = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  if (!verifyShopifyHmac(rawBody, hmac, secret)) {
    return json(401, { ok: false, error: "Invalid Shopify HMAC." });
  }

  const shop = request.headers.get("x-shopify-shop-domain");
  if (!shopMatchesAllowlist(shop, env("SHOPIFY_SHOP_DOMAIN") || null)) {
    return json(401, { ok: false, error: "Unexpected Shopify shop." });
  }

  const topic = request.headers.get("x-shopify-topic")?.trim() ?? "";
  const webhookId = request.headers.get("x-shopify-webhook-id")?.trim() ?? "";
  const productIds = parseMembershipProductIds(
    env("SHOPIFY_MEMBERSHIP_PRODUCT_ID"),
  );

  if (productIds.size === 0) {
    return json(503, {
      ok: false,
      error: "SHOPIFY_MEMBERSHIP_PRODUCT_ID is not set.",
    });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return json(400, { ok: false, error: "Invalid JSON." });
  }

  const action = parseShopifyMembershipAction(topic, payload, productIds);
  if (!action) {
    return json(200, { ok: true, ignored: true, topic });
  }

  try {
    await applyShopifyMembershipAction(action);
    if (webhookId) await markWebhookProcessed(webhookId, topic);
    return json(200, { ok: true, topic, status: action.status });
  } catch (error) {
    console.error("[shopify-webhook] apply failed", error);
    return json(500, { ok: false, error: "Membership update failed." });
  }
}
