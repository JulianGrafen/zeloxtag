import type { MembershipStatus } from "@/types/database";

/** Grace window so a delayed webhook does not lock the owner out overnight. */
const PERIOD_GRACE_MS = 2 * 24 * 60 * 60 * 1000;

function isFutureWithGrace(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const end = Date.parse(iso);
  if (!Number.isFinite(end)) return false;
  return end > Date.now() - PERIOD_GRACE_MS;
}

export function isActiveMembership(
  status: MembershipStatus,
  periodEnd: string | null,
): boolean {
  if (status !== "active") return false;
  return isFutureWithGrace(periodEnd);
}

export type MembershipProEntitlementInput = {
  status: MembershipStatus;
  currentPeriodEnd: string | null;
  trialEndsAt?: string | null;
  stripeSubscriptionId?: string | null;
};

/** Pro access: paid period active, or Stripe trial still running (incl. pending checkout sync). */
export function isMembershipProEntitled(
  input: MembershipProEntitlementInput,
): boolean {
  if (
    isActiveMembership(input.status, input.currentPeriodEnd)
  ) {
    return true;
  }

  const subId = input.stripeSubscriptionId?.trim();
  if (!subId) return false;
  if (input.status !== "active" && input.status !== "pending") return false;

  return isFutureWithGrace(input.trialEndsAt ?? null);
}

export function unixSecondsToIso(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return new Date(value * 1000).toISOString();
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return unixSecondsToIso(Number(value));
  }
  return null;
}
