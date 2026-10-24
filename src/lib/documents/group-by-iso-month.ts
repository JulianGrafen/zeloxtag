export type IsoMonthGroup<T> = {
  monthKey: string;
  items: T[];
};

/** Groups items by `YYYY-MM`, newest months first. Preserves item order within each month. */
export function groupByIsoMonthKeyDesc<T>(
  items: readonly T[],
  monthKeyFor: (item: T) => string,
): IsoMonthGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = monthKeyFor(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([monthKey, groupItems]) => ({ monthKey, items: groupItems }));
}

export function isoMonthKeyFromIsoTimestamp(iso: string): string {
  return iso.slice(0, 7);
}
