import type { MembershipStatus } from "@/types/database";

const USER_ID_NOTE_KEYS = new Set([
  "supabase_user_id",
  "zeloxtag_user_id",
  "user_id",
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ShopifyMembershipAction = {
  status: MembershipStatus;
  email: string | null;
  userId: string | null;
  shopifyCustomerId: string | null;
  shopifyOrderId: string | null;
  shopifyOrderName: string | null;
  shopifyOrderNumber: string | null;
  shopifyOrderToken: string | null;
  shopifyProductId: string | null;
  currentPeriodEnd: string | null;
};

export function normalizeShopifyProductId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const gid = trimmed.match(/gid:\/\/shopify\/product\/(\d+)/i);
  if (gid?.[1]) return gid[1];
  if (/^\d+$/.test(trimmed)) return trimmed;
  return null;
}

export function parseMembershipProductIds(raw: string | undefined): Set<string> {
  const ids = new Set<string>();
  for (const part of (raw ?? "").split(/[,\s]+/)) {
    const id = normalizeShopifyProductId(part);
    if (id) ids.add(id);
  }
  return ids;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeMembershipEmail(value: unknown): string | null {
  const email = asString(value)?.toLowerCase() ?? null;
  if (!email || !email.includes("@") || email.length > 320) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function normalizeEmail(value: unknown): string | null {
  return normalizeMembershipEmail(value);
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function noteAttributes(payload: Record<string, unknown>): Array<{ name: string; value: string }> {
  const buckets: unknown[] = [];
  if (Array.isArray(payload.note_attributes)) buckets.push(...payload.note_attributes);
  if (Array.isArray(payload.noteAttributes)) buckets.push(...payload.noteAttributes);
  if (Array.isArray(payload.attributes)) buckets.push(...payload.attributes);

  const out: Array<{ name: string; value: string }> = [];
  for (const item of buckets) {
    const row = asRecord(item);
    const name = asString(row?.name)?.toLowerCase();
    const value = asString(row?.value);
    if (name && value) out.push({ name, value });
  }

  const attrMap = asRecord(payload.attributes);
  if (attrMap) {
    for (const [name, value] of Object.entries(attrMap)) {
      const parsed = asString(value);
      if (parsed) out.push({ name: name.toLowerCase(), value: parsed });
    }
  }

  for (const item of lineItems(payload)) {
    const props = item.properties;
    if (Array.isArray(props)) {
      for (const prop of props) {
        const row = asRecord(prop);
        const name = asString(row?.name)?.toLowerCase();
        const value = asString(row?.value);
        if (name && value) out.push({ name, value });
      }
    }
    const propMap = asRecord(props);
    if (propMap) {
      for (const [name, value] of Object.entries(propMap)) {
        const parsed = asString(value);
        if (parsed) out.push({ name: name.toLowerCase(), value: parsed });
      }
    }
  }

  return out;
}

function userIdFromNotes(payload: Record<string, unknown>): string | null {
  for (const { name, value } of noteAttributes(payload)) {
    if (USER_ID_NOTE_KEYS.has(name) && isUuid(value)) return value;
  }
  return null;
}

function emailFromOrder(payload: Record<string, unknown>): string | null {
  const customer = asRecord(payload.customer);
  return (
    normalizeEmail(payload.email) ??
    normalizeEmail(payload.contact_email) ??
    normalizeEmail(customer?.email)
  );
}

function customerIdFromPayload(payload: Record<string, unknown>): string | null {
  const customer = asRecord(payload.customer);
  return asString(customer?.id) ?? asString(payload.customer_id);
}

function lineItems(payload: Record<string, unknown>): Record<string, unknown>[] {
  const raw = payload.line_items;
  if (!Array.isArray(raw)) return [];
  return raw.map(asRecord).filter((row): row is Record<string, unknown> => row !== null);
}

export function membershipLineItemProductId(
  payload: Record<string, unknown>,
  productIds: Set<string>,
): string | null {
  if (productIds.size === 0) return null;
  for (const item of lineItems(payload)) {
    const id = normalizeShopifyProductId(item.product_id);
    if (id && productIds.has(id)) return id;
  }
  return null;
}

function addCalendarMonths(iso: string, months: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

function paidAtIso(payload: Record<string, unknown>): string {
  return (
    asString(payload.processed_at) ??
    asString(payload.created_at) ??
    new Date().toISOString()
  );
}

/** Sequential #1001-style numbers are not secrets and must not authorize a claim. */
export function isUnguessableOrderSecret(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 16) return false;
  if (/^\d+$/.test(trimmed)) return false;
  return /^[A-Za-z0-9_-]+$/.test(trimmed);
}

/**
 * Accept a Shopify "view order" URL, a ZeloxTag claim URL, or the raw token.
 * Sequential order names (#1001) are rejected. The Shopify status-page `key`
 * query is ignored — we persist `order.token`, which is the `/orders/{token}` path.
 */
export function extractUnguessableOrderSecret(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const claim = url.searchParams.get("claim");
    if (claim && isUnguessableOrderSecret(claim)) return claim;

    const queryToken = url.searchParams.get("token");
    if (queryToken && isUnguessableOrderSecret(queryToken)) return queryToken;

    const orders = url.pathname.match(/\/orders\/([^/]+)/i);
    if (orders?.[1] && isUnguessableOrderSecret(orders[1])) return orders[1];
  } catch {
    /* pasted token, not a URL */
  }

  return isUnguessableOrderSecret(trimmed) ? trimmed : null;
}

function unguessableTokenFromPayload(payload: Record<string, unknown>): string | null {
  const candidates = [
    asString(payload.token),
    asString(payload.checkout_token),
    asString(payload.order_status_url),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const secret = extractUnguessableOrderSecret(candidate);
    if (secret) return secret;
  }
  return null;
}

function orderIdentity(payload: Record<string, unknown>) {
  return {
    email: emailFromOrder(payload),
    userId: userIdFromNotes(payload),
    shopifyCustomerId: customerIdFromPayload(payload),
    shopifyOrderId: asString(payload.id) ?? asString(payload.order_id),
    shopifyOrderName: asString(payload.name),
    shopifyOrderNumber: asString(payload.order_number),
    shopifyOrderToken: unguessableTokenFromPayload(payload),
  };
}

/**
 * Monthly default when Shopify does not send a billing period.
 * Native subscriptions still fire `orders/paid` on each renewal.
 */
function defaultPeriodEnd(paidAt: string): string {
  return addCalendarMonths(paidAt, 1);
}

export function parseShopifyMembershipAction(
  topic: string,
  payload: unknown,
  productIds: Set<string>,
): ShopifyMembershipAction | null {
  const body = asRecord(payload);
  if (!body) return null;

  const normalizedTopic = topic.trim().toLowerCase();
  const productId = membershipLineItemProductId(body, productIds);
  const identity = orderIdentity(body);
  const paidAt = paidAtIso(body);

  if (normalizedTopic === "orders/paid") {
    if (!productId) return null;
    if (!identity.email && !identity.userId) return null;
    return {
      status: "active",
      ...identity,
      shopifyProductId: productId,
      currentPeriodEnd: defaultPeriodEnd(paidAt),
    };
  }

  if (normalizedTopic === "orders/cancelled") {
    if (!productId) return null;
    if (!identity.email && !identity.userId) return null;
    return {
      status: "canceled",
      ...identity,
      shopifyProductId: productId,
      currentPeriodEnd: null,
    };
  }

  if (
    normalizedTopic === "subscription_billing_attempts/success" ||
    normalizedTopic === "subscriptions/billing_attempts/success"
  ) {
    if (!identity.email && !identity.userId) return null;
    return {
      status: "active",
      ...identity,
      shopifyProductId: productId,
      currentPeriodEnd: defaultPeriodEnd(paidAt),
    };
  }

  if (
    normalizedTopic === "subscription_billing_attempts/failure" ||
    normalizedTopic === "subscriptions/billing_attempts/failure"
  ) {
    if (!identity.email && !identity.userId) return null;
    return {
      status: "past_due",
      ...identity,
      shopifyProductId: productId,
      currentPeriodEnd: null,
    };
  }

  if (
    normalizedTopic === "subscription_contracts/cancel" ||
    normalizedTopic === "subscription_contracts/cancelled"
  ) {
    if (!identity.email && !identity.userId) return null;
    return {
      status: "canceled",
      ...identity,
      shopifyProductId: productId,
      currentPeriodEnd: null,
    };
  }

  return null;
}

export { isActiveMembership } from "./membership";
