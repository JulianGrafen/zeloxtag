export type ParseStringListOptions = {
  /** Max characters per item (default 120 — short labels / vehicle names). */
  maxItemLength?: number;
  /** Max number of items (default 40). */
  maxItems?: number;
};

/** Longer limit for fully worded ABE / Teilegutachten Auflagen. */
export const ABE_CONDITION_MAX_LENGTH = 2_400;
export const ABE_CONDITION_MAX_ITEMS = 40;

/**
 * Parse string[] from FormData / JSONB / unknown RPC payloads.
 */
export function parseStringList(
  raw: unknown,
  options: ParseStringListOptions = {},
): string[] | null {
  const maxItemLength = options.maxItemLength ?? 120;
  const maxItems = options.maxItems ?? 40;

  if (raw == null || raw === "") return null;

  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      const single = raw.trim();
      return single ? [single.slice(0, maxItemLength)] : null;
    }
  }

  if (!Array.isArray(value)) return null;

  const items = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().slice(0, maxItemLength))
    .filter(Boolean)
    .slice(0, maxItems);

  return items.length > 0 ? items : null;
}

/** Parse ABE Auflagen without truncating mid-sentence at 120 chars. */
export function parseAbeConditions(raw: unknown): string[] | null {
  return parseStringList(raw, {
    maxItemLength: ABE_CONDITION_MAX_LENGTH,
    maxItems: ABE_CONDITION_MAX_ITEMS,
  });
}
