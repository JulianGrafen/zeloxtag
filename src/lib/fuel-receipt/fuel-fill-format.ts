/** Parse German-style decimal inputs (38,5 · 1,899 · optional thousand dots). */
export function parseFuelFillDecimal(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  let normalized = raw.trim().replace(/\s/g, "");
  if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  }
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function formatFuelAmountForInput(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString("de-DE", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function formatFuelLitersForInput(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return rounded.toLocaleString("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

export function formatFuelPricePerLiterForInput(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return rounded.toLocaleString("de-DE", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 3,
    maximumFractionDigits: 3,
  });
}

export function formatFuelPricePerLiterFromTotal(
  amountEur: number,
  liters: number,
): string {
  if (liters <= 0) return "";
  return formatFuelPricePerLiterForInput(amountEur / liters);
}
