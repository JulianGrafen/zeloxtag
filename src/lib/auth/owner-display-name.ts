export function ownerDisplayNameFromMetadata(
  user: { user_metadata?: Record<string, unknown> } | null | undefined,
): string | null {
  const meta = user?.user_metadata;
  if (!meta) return null;

  const candidates = [meta.name, meta.full_name, meta.display_name];
  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}
