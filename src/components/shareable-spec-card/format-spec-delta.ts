function formatSignedDelta(delta: number, unit: string): string {
  const rounded = Math.round(delta);
  if (rounded === 0) return "";
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded} ${unit}`.trim();
}

export function formatSpecDelta(
  current: number,
  stockValue: number | undefined,
  unit: string,
): string | undefined {
  if (stockValue == null || !Number.isFinite(stockValue) || !Number.isFinite(current)) {
    return undefined;
  }
  const delta = current - stockValue;
  const formatted = formatSignedDelta(delta, unit);
  return formatted || undefined;
}

export function slugifyShareFilename(base: string): string {
  const slug = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "build";
}
