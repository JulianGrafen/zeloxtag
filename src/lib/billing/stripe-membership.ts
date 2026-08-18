import type { MembershipStatus } from "@/types/database";

import { unixSecondsToIso } from "./membership";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StripeMembershipAction = {
  status: MembershipStatus;
  userId: string | null;
  email: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodEnd: string | null;
};

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

function asUuid(value: unknown): string | null {
  const id = asString(value);
  if (!id || !UUID_RE.test(id)) return null;
  return id;
}

function normalizeEmail(value: unknown): string | null {
  const email = asString(value)?.toLowerCase() ?? null;
  if (!email || !email.includes("@") || email.length > 320) return null;
  return email;
}

function userIdFrom(obj: Record<string, unknown> | null): string | null {
  if (!obj) return null;
  const meta = asRecord(obj.metadata);
  return (
    asUuid(meta?.user_id) ??
    asUuid(meta?.supabase_user_id) ??
    asUuid(obj.client_reference_id)
  );
}

function customerId(value: unknown): string | null {
  if (typeof value === "string") return asString(value);
  const row = asRecord(value);
  return asString(row?.id);
}

function subscriptionId(value: unknown): string | null {
  if (typeof value === "string") return asString(value);
  const row = asRecord(value);
  return asString(row?.id);
}

function stripeStatus(value: unknown): MembershipStatus | null {
  const status = asString(value);
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled" || status === "incomplete_expired") return "canceled";
  if (status === "incomplete" || status === "paused") return "pending";
  return null;
}

function firstItem(subscription: Record<string, unknown>): Record<string, unknown> | null {
  const items = asRecord(subscription.items);
  if (!items || !Array.isArray(items.data)) return null;
  return asRecord(items.data[0]);
}

function periodEndFromSubscription(subscription: Record<string, unknown>): string | null {
  return (
    unixSecondsToIso(subscription.current_period_end) ??
    unixSecondsToIso(firstItem(subscription)?.current_period_end)
  );
}

function priceIdFromSubscription(subscription: Record<string, unknown>): string | null {
  const price = asRecord(firstItem(subscription)?.price);
  return asString(price?.id) ?? asString(firstItem(subscription)?.price);
}

function activeStatusRequiresPeriodEnd(
  status: MembershipStatus,
  periodEnd: string | null,
): MembershipStatus {
  if (status !== "active") return status;
  if (!periodEnd) return "pending";
  const end = Date.parse(periodEnd);
  if (!Number.isFinite(end)) return "pending";
  return "active";
}

function actionFromSubscription(
  subscription: Record<string, unknown>,
  extras?: { userId?: string | null; email?: string | null },
): StripeMembershipAction | null {
  const status = stripeStatus(subscription.status);
  if (!status) return null;
  const email =
    extras?.email ??
    normalizeEmail(asRecord(subscription.customer)?.email) ??
    null;
  const userId = extras?.userId ?? userIdFrom(subscription);
  const periodEnd = periodEndFromSubscription(subscription);
  return {
    status: activeStatusRequiresPeriodEnd(status, periodEnd),
    userId,
    email,
    stripeCustomerId: customerId(subscription.customer),
    stripeSubscriptionId: asString(subscription.id),
    stripePriceId: priceIdFromSubscription(subscription),
    currentPeriodEnd: periodEnd,
  };
}

function invoiceSubscriptionId(invoice: Record<string, unknown>): string | null {
  const parent = asRecord(invoice.parent);
  const details = asRecord(parent?.subscription_details);
  return (
    subscriptionId(invoice.subscription) ??
    subscriptionId(details?.subscription)
  );
}

function periodEndFromInvoice(invoice: Record<string, unknown>): string | null {
  const lines = asRecord(invoice.lines);
  if (lines && Array.isArray(lines.data)) {
    for (const line of lines.data) {
      const row = asRecord(line);
      const period = asRecord(row?.period);
      const end = unixSecondsToIso(period?.end);
      if (end) return end;
    }
  }
  return unixSecondsToIso(invoice.period_end);
}

function actionFromInvoicePaid(
  invoice: Record<string, unknown>,
): StripeMembershipAction | null {
  const userId = userIdFrom(invoice);
  const email = normalizeEmail(invoice.customer_email);
  if (!userId && !email && !customerId(invoice.customer) && !invoiceSubscriptionId(invoice)) {
    return null;
  }
  const periodEnd = periodEndFromInvoice(invoice);
  return {
    status: activeStatusRequiresPeriodEnd("active", periodEnd),
    userId,
    email,
    stripeCustomerId: customerId(invoice.customer),
    stripeSubscriptionId: invoiceSubscriptionId(invoice),
    stripePriceId: null,
    currentPeriodEnd: periodEnd,
  };
}

export function parseStripeMembershipAction(
  type: string,
  object: unknown,
): StripeMembershipAction | null {
  const body = asRecord(object);
  if (!body) return null;
  const eventType = type.trim().toLowerCase();

  if (eventType === "checkout.session.completed") {
    const mode = asString(body.mode);
    if (mode && mode !== "subscription") return null;
    const payment = asString(body.payment_status);
    if (payment && payment !== "paid" && payment !== "no_payment_required") {
      return null;
    }
    const expanded = asRecord(body.subscription);
    const details = asRecord(body.customer_details);
    const userId = userIdFrom(body) ?? userIdFrom(expanded);
    const email =
      normalizeEmail(details?.email) ??
      normalizeEmail(body.customer_email) ??
      null;
    if (expanded?.object === "subscription") {
      return actionFromSubscription(expanded, { userId, email });
    }
    if (!userId && !email) return null;
    return {
      status: "pending",
      userId,
      email,
      stripeCustomerId: customerId(body.customer),
      stripeSubscriptionId: subscriptionId(body.subscription),
      stripePriceId: null,
      currentPeriodEnd: null,
    };
  }

  if (
    eventType === "customer.subscription.created" ||
    eventType === "customer.subscription.updated"
  ) {
    return actionFromSubscription(body);
  }

  if (eventType === "customer.subscription.deleted") {
    const action = actionFromSubscription({ ...body, status: "canceled" });
    if (!action) return null;
    return { ...action, status: "canceled", currentPeriodEnd: action.currentPeriodEnd };
  }

  if (eventType === "invoice.paid" || eventType === "invoice.payment_succeeded") {
    return actionFromInvoicePaid(body);
  }

  if (eventType === "invoice.payment_failed") {
    return {
      status: "past_due",
      userId: userIdFrom(body),
      email: normalizeEmail(body.customer_email),
      stripeCustomerId: customerId(body.customer),
      stripeSubscriptionId: invoiceSubscriptionId(body),
      stripePriceId: null,
      currentPeriodEnd: periodEndFromInvoice(body),
    };
  }

  return null;
}
