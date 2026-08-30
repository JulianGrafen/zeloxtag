/** Server/client mileage plausibility errors from validateMileageAgainstHistory. */
export function isMileagePlausibilityMessage(message: string | null | undefined): boolean {
  if (!message?.trim()) return false;
  const normalized = message.trim();
  return (
    normalized.includes("liegt deutlich unter dem letzten Eintrag") ||
    normalized === "Kilometerstand unplausibel."
  );
}
