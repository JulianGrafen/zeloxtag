import { NextResponse, type NextRequest } from "next/server";

import {
  applyShopifyMembershipAction,
  releaseShopifyWebhookEvent,
  reserveShopifyWebhookEvent,
} from "@/lib/billing/membership-store";
import {
  shopMatchesAllowlist,
  verifyShopifyHmac,
} from "@/lib/billing/shopify-hmac";
import {
  parseMembershipProductIds,
  parseShopifyMembershipAction,
} from "@/lib/billing/shopify-membership";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
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

  if (!isSupabaseAdminConfigured()) {
    return json(503, { ok: false, error: "Supabase is not configured." });
  }

  // Without the delivery id there is no replay protection, so reject rather
  // than process an event that could be re-sent indefinitely.
  if (!webhookId) {
    return json(400, { ok: false, error: "Missing X-Shopify-Webhook-Id." });
  }

  let reserved: "new" | "duplicate" = "new";
  try {
    reserved = await reserveShopifyWebhookEvent(webhookId, topic);
    if (reserved === "duplicate") {
      return json(200, { ok: true, duplicate: true, topic });
    }

    await applyShopifyMembershipAction(action);
    return json(200, { ok: true, topic, status: action.status });
  } catch (error) {
    if (webhookId && reserved === "new") {
      await releaseShopifyWebhookEvent(webhookId);
    }
    console.error("[shopify-webhook] apply failed", error);
    return json(500, { ok: false, error: "Membership update failed." });
  }
}
