/** Short display id for physical V4A tags until dedicated inventory ids ship. */
export function formatV4aTagDisplayId(tagUuid: string | undefined | null): string | undefined {
  if (!tagUuid) return undefined;
  const normalized = tagUuid.trim().replace(/-/g, "");
  if (normalized.length < 4) return undefined;
  const suffix = normalized.slice(-4).toUpperCase();
  return `#ZX-${suffix}`;
}
