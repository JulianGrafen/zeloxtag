import { randomBytes } from "crypto";
import { cache } from "react";

import { sendMembershipClaimEmail } from "@/lib/email/resend";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import type { Membership, MembershipStatus } from "@/types/database";

import {
  extractUnguessableOrderSecret,
  isActiveMembership,
  normalizeMembershipEmail,
  type ShopifyMembershipAction,
} from "./shopify-membership";
import { shopifyMayUpdateEntitlement } from "./membership-provider";
import type { StripeMembershipAction } from "./stripe-membership";

function asMembership(row: unknown): Membership | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const status = record.status;
  if (
    status !== "pending" &&
    status !== "active" &&
    status !== "past_due" &&
    status !== "canceled"
  ) {
    return null;
  }
  if (typeof record.email !== "string") return null;
  return {
    id: String(record.id ?? ""),
    user_id: typeof record.user_id === "string" ? record.user_id : null,
    email: record.email,
    shopify_customer_id:
      typeof record.shopify_customer_id === "string"
        ? record.shopify_customer_id
        : null,
    shopify_order_id:
      typeof record.shopify_order_id === "string" ? record.shopify_order_id : null,
    shopify_order_name:
      typeof record.shopify_order_name === "string"
        ? record.shopify_order_name
        : null,
    shopify_order_number:
      typeof record.shopify_order_number === "string"
        ? record.shopify_order_number
        : null,
    shopify_order_token:
      typeof record.shopify_order_token === "string"
        ? record.shopify_order_token
        : null,
    shopify_product_id:
      typeof record.shopify_product_id === "string"
        ? record.shopify_product_id
        : null,
    stripe_customer_id:
      typeof record.stripe_customer_id === "string"
        ? record.stripe_customer_id
        : null,
    stripe_subscription_id:
      typeof record.stripe_subscription_id === "string"
        ? record.stripe_subscription_id
        : null,
    stripe_price_id:
      typeof record.stripe_price_id === "string" ? record.stripe_price_id : null,
    billing_provider:
      record.billing_provider === "stripe" || record.billing_provider === "shopify"
        ? record.billing_provider
        : null,
    status,
    current_period_end:
      typeof record.current_period_end === "string"
        ? record.current_period_end
        : null,
    paid_at: typeof record.paid_at === "string" ? record.paid_at : null,
    canceled_at:
      typeof record.canceled_at === "string" ? record.canceled_at : null,
    created_at: String(record.created_at ?? ""),
    updated_at: String(record.updated_at ?? ""),
  };
}

function newClaimToken(): string {
  return randomBytes(24).toString("base64url");
}

function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://app.zeloxtag.de";
  return raw.replace(/\/$/, "");
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("find_user_id_by_email", {
    p_email: email,
  });
  if (error) {
    console.error("[memberships] email lookup failed", error.message);
    return null;
  }
  return typeof data === "string" && data.length > 0 ? data : null;
}

async function loadMembershipByEmail(
  email: string,
): Promise<(Membership & { claim_token: string | null }) | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("memberships")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error) {
    console.error("[memberships] email read failed", error.message);
    return null;
  }
  const membership = asMembership(data);
  if (!membership || !data || typeof data !== "object") return null;
  const token = (data as Record<string, unknown>).claim_token;
  return {
    ...membership,
    claim_token: typeof token === "string" ? token : null,
  };
}

async function attachUser(membershipId: string, userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("memberships")
    .update({ user_id: userId, claim_token: null })
    .eq("id", membershipId);
  if (error) {
    throw new Error(`Membership claim failed: ${error.message}`);
  }
}

export async function applyShopifyMembershipAction(
  action: ShopifyMembershipAction,
): Promise<void> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin is not configured.");
  }

  const email = action.email?.toLowerCase() ?? null;
  const userId =
    action.userId ?? (email ? await findUserIdByEmail(email) : null);
  if (!email && !userId) {
    throw new Error("Membership webhook has no email or user id.");
  }

  const now = new Date().toISOString();
  const existing = email ? await loadMembershipByEmail(email) : null;
  const needsClaim = !userId && action.status === "active";
  const claimToken = needsClaim
    ? existing?.claim_token || newClaimToken()
    : null;

  const admin = createAdminClient();
  const row: Record<string, unknown> = {
    email: email ?? `${userId}@users.zeloxtag.internal`,
    user_id: userId,
    shopify_customer_id: action.shopifyCustomerId,
    shopify_order_id: action.shopifyOrderId,
    shopify_order_name: action.shopifyOrderName,
    shopify_order_number: action.shopifyOrderNumber,
    shopify_order_token: action.shopifyOrderToken,
    shopify_product_id: action.shopifyProductId,
    claim_token: userId ? null : claimToken,
  };

  if (shopifyMayUpdateEntitlement(existing)) {
    row.billing_provider = "shopify";
    row.status = action.status;
    row.current_period_end = action.currentPeriodEnd;
    row.canceled_at = action.status === "canceled" ? now : null;
    if (action.status === "active") {
      row.paid_at = now;
    }
  }

  const conflict = email ? "email" : "user_id";
  const { error } = await admin.from("memberships").upsert(row, {
    onConflict: conflict,
  });
  if (error) {
    throw new Error(`Membership upsert failed: ${error.message}`);
  }

  if (needsClaim && email && claimToken && !existing?.claim_token) {
    const claimUrl = `${siteOrigin()}/settings?claim=${encodeURIComponent(claimToken)}`;
    const mailed = await sendMembershipClaimEmail({ to: email, claimUrl });
    if (!mailed.ok) {
      console.error("[memberships] claim email failed", mailed.message);
    }
  }
}

async function loadMembershipByColumn(
  column: "stripe_subscription_id" | "stripe_customer_id",
  value: string,
): Promise<Membership | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("memberships")
    .select("*")
    .eq(column, value)
    .maybeSingle();
  if (error) {
    console.error(`[memberships] ${column} read failed`, error.message);
    return null;
  }
  return asMembership(data);
}

async function findExistingStripeMembership(
  action: StripeMembershipAction,
): Promise<Membership | null> {
  if (action.userId) {
    const byUser = await getMembershipForUser(action.userId);
    if (byUser) return byUser;
  }
  if (action.stripeSubscriptionId) {
    const bySub = await loadMembershipByColumn(
      "stripe_subscription_id",
      action.stripeSubscriptionId,
    );
    if (bySub) return bySub;
  }
  if (action.stripeCustomerId) {
    const byCustomer = await loadMembershipByColumn(
      "stripe_customer_id",
      action.stripeCustomerId,
    );
    if (byCustomer) return byCustomer;
  }
  if (action.email) {
    const byEmail = await loadMembershipByEmail(action.email);
    if (byEmail) return byEmail;
  }
  return null;
}

export async function applyStripeMembershipAction(
  action: StripeMembershipAction,
): Promise<void> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin is not configured.");
  }

  const existing = await findExistingStripeMembership(action);
  const email =
    action.email?.toLowerCase() ?? existing?.email ?? null;
  const userId =
    action.userId ??
    existing?.user_id ??
    (email ? await findUserIdByEmail(email) : null);
  if (!email && !userId) {
    throw new Error("Stripe membership webhook has no email or user id.");
  }

  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    email: email ?? `${userId}@users.zeloxtag.internal`,
    user_id: userId,
    billing_provider: "stripe",
    status: action.status,
    claim_token: null,
  };
  if (action.stripeCustomerId) row.stripe_customer_id = action.stripeCustomerId;
  if (action.stripeSubscriptionId) {
    row.stripe_subscription_id = action.stripeSubscriptionId;
  }
  if (action.stripePriceId) row.stripe_price_id = action.stripePriceId;
  if (action.currentPeriodEnd) row.current_period_end = action.currentPeriodEnd;
  if (action.status === "active") row.paid_at = now;
  if (action.status === "canceled") row.canceled_at = now;
  else row.canceled_at = null;

  const admin = createAdminClient();
  if (existing) {
    const { error } = await admin.from("memberships").update(row).eq("id", existing.id);
    if (error) {
      throw new Error(`Membership Stripe update failed: ${error.message}`);
    }
    return;
  }

  const { error } = await admin.from("memberships").insert(row);
  if (error) {
    throw new Error(`Membership Stripe insert failed: ${error.message}`);
  }
}

export async function reserveStripeWebhookEvent(
  id: string,
  type: string,
): Promise<"new" | "duplicate"> {
  if (!isSupabaseAdminConfigured()) return "new";
  const admin = createAdminClient();
  const { error } = await admin.from("stripe_webhook_events").insert({ id, type });
  if (error) {
    if (error.code === "23505") return "duplicate";
    throw new Error(`Stripe webhook log failed: ${error.message}`);
  }
  return "new";
}

export async function releaseStripeWebhookEvent(id: string): Promise<void> {
  if (!isSupabaseAdminConfigured() || !id) return;
  const admin = createAdminClient();
  const { error } = await admin.from("stripe_webhook_events").delete().eq("id", id);
  if (error) {
    console.error("[memberships] stripe webhook release failed", error.message);
  }
}

/** @deprecated Use reserveStripeWebhookEvent — dedupe must happen before apply. */
export async function recordStripeWebhookEvent(
  id: string,
  type: string,
): Promise<"applied" | "duplicate"> {
  const reserved = await reserveStripeWebhookEvent(id, type);
  return reserved === "duplicate" ? "duplicate" : "applied";
}

export async function reserveShopifyWebhookEvent(
  id: string,
  topic: string,
): Promise<"new" | "duplicate"> {
  if (!isSupabaseAdminConfigured() || !id) return "new";
  const admin = createAdminClient();
  const { error } = await admin.from("shopify_webhook_events").insert({ id, topic });
  if (error) {
    if (error.code === "23505") return "duplicate";
    throw new Error(`Shopify webhook log failed: ${error.message}`);
  }
  return "new";
}

export async function releaseShopifyWebhookEvent(id: string): Promise<void> {
  if (!isSupabaseAdminConfigured() || !id) return;
  const admin = createAdminClient();
  const { error } = await admin.from("shopify_webhook_events").delete().eq("id", id);
  if (error) {
    console.error("[memberships] shopify webhook release failed", error.message);
  }
}

const UNKNOWN_CLAIM_TOKEN =
  "Dieser Freischalt-Link ist ungültig oder schon verwendet.";

export type ClaimMembershipOutcome =
  | { status: "ok" }
  | { status: "sent" }
  | { status: "error"; message: string };

async function loadMembershipByClaimToken(secret: string): Promise<Membership | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("memberships")
    .select("*")
    .eq("claim_token", secret)
    .maybeSingle();
  if (error) {
    console.error("[memberships] claim_token lookup failed", error.message);
    return null;
  }
  return asMembership(data);
}

async function ensureClaimEmail(
  membership: Membership & { claim_token: string | null },
  email: string,
): Promise<void> {
  const token = membership.claim_token || newClaimToken();
  if (!membership.claim_token) {
    const admin = createAdminClient();
    const { error } = await admin
      .from("memberships")
      .update({ claim_token: token })
      .eq("id", membership.id);
    if (error) {
      throw new Error(`Claim token persist failed: ${error.message}`);
    }
  }
  const claimUrl = `${siteOrigin()}/settings?claim=${encodeURIComponent(token)}`;
  const mailed = await sendMembershipClaimEmail({ to: email, claimUrl });
  if (!mailed.ok) {
    throw new Error(mailed.message);
  }
}

export async function claimMembershipForUser(
  userId: string,
  input: {
    token?: string | null;
    shopifyEmail?: string | null;
    loginEmail?: string | null;
  },
): Promise<ClaimMembershipOutcome> {
  if (!isSupabaseAdminConfigured()) {
    return { status: "error", message: "Supabase ist nicht konfiguriert." };
  }

  const already = await getMembershipForUser(userId);
  if (already && isActiveMembership(already.status, already.current_period_end)) {
    return { status: "ok" };
  }

  const limited = await rateLimit({
    key: `membership-claim:${userId}`,
    limit: RATE_LIMITS.membershipClaim.limit,
    windowMs: RATE_LIMITS.membershipClaim.windowMs,
  });
  if (!limited.ok) {
    return {
      status: "error",
      message: "Zu viele Versuche. Bitte in ein paar Minuten erneut.",
    };
  }

  const token = extractUnguessableOrderSecret(input.token ?? "");

  if (token) {
    const membership = await loadMembershipByClaimToken(token);
    if (!membership) {
      return { status: "error", message: UNKNOWN_CLAIM_TOKEN };
    }
    if (membership.user_id && membership.user_id !== userId) {
      return {
        status: "error",
        message: "Diese Zahlung ist bereits mit einem anderen Konto verknüpft.",
      };
    }
    await attachUser(membership.id, userId);
    return { status: "ok" };
  }

  const shopifyEmail = normalizeMembershipEmail(input.shopifyEmail);
  if (!shopifyEmail) {
    return {
      status: "error",
      message: "Bitte die E-Mail aus dem Shopify-Checkout angeben.",
    };
  }

  const membership = await loadMembershipByEmail(shopifyEmail);
  if (!membership) {
    return {
      status: "error",
      message: "Keine bezahlte Mitgliedschaft zu dieser Mail gefunden.",
    };
  }

  if (!membership.user_id) {
    try {
      await ensureClaimEmail(membership, shopifyEmail);
    } catch (error) {
      console.error(
        "[memberships] claim mail failed",
        error instanceof Error ? error.message : error,
      );
      return {
        status: "error",
        message: "Link konnte nicht gesendet werden. Bitte später erneut versuchen.",
      };
    }
  }

  return { status: "sent" };
}

async function getMembershipForUserUncached(
  userId: string,
): Promise<Membership | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("memberships")
    .select(
      "id, user_id, email, shopify_customer_id, shopify_order_id, shopify_order_name, shopify_order_number, shopify_order_token, shopify_product_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, billing_provider, status, current_period_end, paid_at, canceled_at, created_at, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[memberships] read failed", error.message);
    return null;
  }
  return asMembership(data);
}

/** Request-memoized — Pro gates on a page share one membership lookup. */
export const getMembershipForUser = cache(getMembershipForUserUncached);

export async function userHasActiveMembership(userId: string): Promise<boolean> {
  const membership = await getMembershipForUser(userId);
  if (!membership) return false;
  return isActiveMembership(
    membership.status as MembershipStatus,
    membership.current_period_end,
  );
}
