export const MAX_MINT_BATCH = 25;

export function parseMintCount(raw: unknown): number | null {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseInt(raw, 10)
        : NaN;
  if (!Number.isInteger(n) || n < 1 || n > MAX_MINT_BATCH) return null;
  return n;
}
