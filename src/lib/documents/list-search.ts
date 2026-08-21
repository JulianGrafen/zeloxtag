/**
 * Shared text search / chip filtering for ABE and Umbau lists.
 */

export function normalizeSearchQuery(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u00ad\u2010-\u2015]/g, "") // soft / fancy hyphens
    .toLowerCase()
    .replace(/[^a-z0-9*+/.\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when every whitespace-separated token appears somewhere in haystack. */
export function matchesSearchQuery(
  query: string,
  ...fields: Array<string | null | undefined>
): boolean {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return true;

  const haystack = normalizeSearchQuery(
    fields
      .filter((field): field is string => Boolean(field?.trim()))
      .join(" "),
  );
  if (!haystack) return false;

  return normalized.split(" ").every((token) => haystack.includes(token));
}

export type ListFilterChip = {
  id: string;
  label: string;
  /** Full label for native tooltip when chip text is shortened. */
  title?: string;
  count?: number;
};

export function shortFilterChipLabel(label: string, max = 22): string {
  const trimmed = label.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(1, max - 1))}…`;
}

/** Unique non-empty values, sorted by frequency then label. */
export function collectFilterValues(
  values: Array<string | null | undefined>,
): ListFilterChip[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const label = raw?.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ id: label, label, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return (b.count ?? 0) - (a.count ?? 0);
      return a.label.localeCompare(b.label, "de");
    });
}
