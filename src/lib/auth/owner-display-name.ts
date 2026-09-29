export function ownerDisplayNameFromMetadata(
  user: { user_metadata?: { name?: unknown } } | null | undefined,
): string | null {
  const raw = user?.user_metadata?.name;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}
