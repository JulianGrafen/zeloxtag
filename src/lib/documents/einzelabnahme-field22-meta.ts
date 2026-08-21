/** Pull structured hints from verbatim Feld-22 prose when the LLM missed them. */
export function parseEinzelabnahmeField22Meta(field22: string | null | undefined): {
  mileageKm: number | null;
  officialExpert: string | null;
} {
  if (!field22?.trim()) {
    return { mileageKm: null, officialExpert: null };
  }

  const text = field22.replace(/\r\n/g, "\n");

  let mileageKm: number | null = null;
  const kmMatch =
    /(?:km[-\s]?Stand|Kilometerstand|KM)\s*[:\s]*(\d{1,3}(?:\.\d{3})*|\d+)\s*km?/i.exec(
      text,
    ) ?? /\b(\d{1,3}(?:\.\d{3})+)\s*km\b/i.exec(text);
  if (kmMatch?.[1]) {
    const parsed = Number.parseInt(kmMatch[1].replace(/\./g, ""), 10);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 2_000_000) {
      mileageKm = parsed;
    }
  }

  let officialExpert: string | null = null;
  const expertMatch =
    /(?:Amtlich anerkannter\s+)?Sachverständiger\s*[:\s]*([^\n]{3,120})/i.exec(
      text,
    ) ??
    /Prüfer\s*[:\s]*([^\n]{3,120})/i.exec(text) ??
    /Prüfingenieur\s*[:\s]*([^\n]{3,120})/i.exec(text);
  if (expertMatch?.[1]) {
    officialExpert = expertMatch[1].replace(/\s+/g, " ").trim().slice(0, 200);
  }

  return { mileageKm, officialExpert };
}
