import { MAX_MINT_BATCH } from "@/lib/tags/mint-batch";
import { isPlaqueTagUuid } from "@/lib/tags/plaque-qr";

/** Validates operator mint / export UUID lists (1…MAX_MINT_BATCH). */
export function parseMintPlaqueUuidList(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MINT_BATCH) {
    return null;
  }
  const uuids: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !isPlaqueTagUuid(item)) return null;
    uuids.push(item.trim());
  }
  return uuids;
}
