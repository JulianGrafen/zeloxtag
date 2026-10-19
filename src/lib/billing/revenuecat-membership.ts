import type { MembershipStatus } from "@/types/database";

export type RevenueCatWebhookEventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "UNCANCELLATION"
  | "NON_RENEWING_PURCHASE"
  | "CANCELLATION"
  | "EXPIRATION"
  | "BILLING_ISSUE"
  | "PRODUCT_CHANGE"
  | "SUBSCRIPTION_PAUSED"
  | "TRANSFER";

export type RevenueCatMembershipAction = {
  eventId: string;
  eventType: RevenueCatWebhookEventType;
  userId: string;
  productId: string | null;
  status: MembershipStatus;
  currentPeriodEnd: string | null;
};

const ACTIVE_EVENT_TYPES = new Set<RevenueCatWebhookEventType>([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "PRODUCT_CHANGE",
]);

const INACTIVE_EVENT_TYPES = new Set<RevenueCatWebhookEventType>([
  "EXPIRATION",
]);

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function expirationIsoFromMs(value: unknown): string | null {
  const ms = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return new Date(ms).toISOString();
}

export function resolveRevenueCatEntitlementId(): string {
  return process.env.REVENUECAT_ENTITLEMENT_ID?.trim() || "pro";
}

export function parseRevenueCatWebhookBody(
  body: unknown,
): RevenueCatMembershipAction | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const event =
    root.event && typeof root.event === "object"
      ? (root.event as Record<string, unknown>)
      : root;

  const eventId = readString(event.id);
  const eventType = readString(event.type) as RevenueCatWebhookEventType | null;
  const userId = readString(event.app_user_id);
  if (!eventId || !eventType || !userId) return null;

  if (!ACTIVE_EVENT_TYPES.has(eventType) && !INACTIVE_EVENT_TYPES.has(eventType)) {
    if (eventType === "CANCELLATION" || eventType === "BILLING_ISSUE") {
      // Access may continue until expiration_at_ms — treat as active with period end.
    } else {
      return null;
    }
  }

  const productId = readString(event.product_id);
  const expirationAt = expirationIsoFromMs(
    event.expiration_at_ms ?? event.expiration_at,
  );

  let status: MembershipStatus = "active";
  if (INACTIVE_EVENT_TYPES.has(eventType)) {
    status = "canceled";
  } else if (eventType === "BILLING_ISSUE") {
    status = "past_due";
  } else if (eventType === "CANCELLATION") {
    status = expirationAt && new Date(expirationAt).getTime() > Date.now()
      ? "active"
      : "canceled";
  }

  return {
    eventId,
    eventType,
    userId,
    productId,
    status,
    currentPeriodEnd: expirationAt,
  };
}

export type RevenueCatSubscriberSnapshot = {
  userId: string;
  productId: string | null;
  status: MembershipStatus;
  currentPeriodEnd: string | null;
};

/** Map RevenueCat REST subscriber payload to membership row fields. */
export function parseRevenueCatSubscriberResponse(
  userId: string,
  body: unknown,
  entitlementId = resolveRevenueCatEntitlementId(),
): RevenueCatSubscriberSnapshot | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const subscriber =
    root.subscriber && typeof root.subscriber === "object"
      ? (root.subscriber as Record<string, unknown>)
      : null;
  if (!subscriber) return null;

  const entitlements =
    subscriber.entitlements && typeof subscriber.entitlements === "object"
      ? (subscriber.entitlements as Record<string, unknown>)
      : {};
  const entitlement =
    entitlements[entitlementId] &&
    typeof entitlements[entitlementId] === "object"
      ? (entitlements[entitlementId] as Record<string, unknown>)
      : null;

  if (!entitlement) {
    return {
      userId,
      productId: null,
      status: "canceled",
      currentPeriodEnd: null,
    };
  }

  const expires = readString(entitlement.expires_date);
  const productId = readString(entitlement.product_identifier);
  const active =
    !expires || new Date(expires).getTime() > Date.now();

  return {
    userId,
    productId,
    status: active ? "active" : "canceled",
    currentPeriodEnd: expires,
  };
}
