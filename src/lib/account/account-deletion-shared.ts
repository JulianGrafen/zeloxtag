export const ACCOUNT_DELETION_GRACE_DAYS = 30;

export type AccountDeletionStatus = "none" | "grace" | "canceled" | "completed";

export type AccountDeletionState = {
  status: AccountDeletionStatus;
  requestedAt: string | null;
  graceEndsAt: string | null;
  daysRemaining: number | null;
};

export const ACCOUNT_READ_ONLY_MESSAGE =
  "Dein Konto wird gelöscht — nur noch Lesen und Datenexport sind möglich.";

export function formatGraceEndDateGerman(iso: string): string {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "long",
      timeZone: "Europe/Berlin",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function daysUntilGraceEnd(graceEndsAt: string): number {
  const ms = new Date(graceEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function isGracePeriodExpired(graceEndsAt: string, now = Date.now()): boolean {
  return new Date(graceEndsAt).getTime() < now;
}
