import type { MembershipStatus } from "@/types/database";

/** Grace window so a delayed webhook does not lock the owner out overnight. */
const PERIOD_GRACE_MS = 2 * 24 * 60 * 60 * 1000;

export function isActiveMembership(
  status: MembershipStatus,
  periodEnd: string | null,
): boolean {
  if (status !== "active") return false;
  if (!periodEnd) return true;
  const end = Date.parse(periodEnd);
  if (!Number.isFinite(end)) return true;
  return end > Date.now() - PERIOD_GRACE_MS;
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
