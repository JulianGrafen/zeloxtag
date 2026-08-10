import type { AbeVehicleContext } from "@/lib/validations/abeSchema";
import { normalizeMatchToken } from "@/services/ocr/TableMatchingService";

/** Brand aliases for ABE Verkaufsbezeichnung matching (headers rarely spell out full legal names). */
const BRAND_ALIASES: Record<string, string[]> = {
  bmw: ["bmw"],
  volkswagen: ["volkswagen", "vw"],
  vw: ["volkswagen", "vw"],
  mercedes: ["mercedes", "mercedes benz", "daimler"],
  "mercedes benz": ["mercedes", "mercedes benz", "daimler"],
  daimler: ["mercedes", "mercedes benz", "daimler"],
  audi: ["audi"],
  porsche: ["porsche"],
  opel: ["opel"],
  ford: ["ford"],
  seat: ["seat"],
  skoda: ["skoda"],
};

function uniqueTokens(tokens: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of tokens) {
    const normalized = normalizeMatchToken(token);
    if (!normalized || normalized.length < 2 || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function brandSearchTokens(brand: string): string[] {
  const normalized = normalizeMatchToken(brand);
  const aliases = BRAND_ALIASES[normalized] ?? [normalized];
  return uniqueTokens(aliases);
}

/**
 * Expand garage model (320d, C200, Golf GTI) into ABE-style search tokens
 * (3er reihe, c klasse, golf gti, …).
 */
export function expandGarageModelToAbeTokens(model: string): string[] {
  const raw = model.trim();
  const normalized = normalizeMatchToken(raw);
  const tokens = [normalized, ...normalized.split(" ").filter((part) => part.length >= 2)];

  const compact = raw.replace(/[\s-]/g, "").toUpperCase();

  const bmwSeries = /^(\d)(?:\d{2}[A-Z]?|[A-Z]\d{2})$/i.exec(compact);
  if (bmwSeries?.[1]) {
    const series = bmwSeries[1];
    tokens.push(`${series}er`, `${series}er reihe`, `${series}er touring`);
  }

  const bmwWordSeries = /\b([1-8])\s*er\b/i.exec(raw);
  if (bmwWordSeries?.[1]) {
    const series = bmwWordSeries[1];
    tokens.push(`${series}er`, `${series}er reihe`);
  }

  const mercClass = /^([A-Z])\s*-?\s*(\d{2,3})/i.exec(compact);
  if (mercClass?.[1]) {
    const letter = mercClass[1].toLowerCase();
    tokens.push(`${letter} klasse`, `${letter}-klasse`, `${letter}er`);
  }

  if (/\bGTI\b/i.test(raw)) {
    tokens.push("gti", "golf gti", "golf");
  }

  if (/\bGTI\b/i.test(raw) === false && /\bGOLF\b/i.test(raw)) {
    tokens.push("golf");
  }

  if (/\bPOLO\b/i.test(raw)) {
    tokens.push("polo");
  }

  if (/\bPASSAT\b/i.test(raw)) {
    tokens.push("passat");
  }

  return uniqueTokens(tokens);
}

export function expandVehicleContextForMatching(
  vehicle: AbeVehicleContext,
): string[] {
  return uniqueTokens([
    ...brandSearchTokens(vehicle.brand),
    ...expandGarageModelToAbeTokens(vehicle.model),
    vehicle.model,
    vehicle.type ?? "",
    vehicle.egBe ?? "",
  ]);
}

export function scoreHaystackAgainstGarageVehicle(
  haystack: string,
  vehicle: AbeVehicleContext,
): number {
  const text = normalizeMatchToken(haystack);
  if (!text) return 0;

  const tokens = expandVehicleContextForMatching(vehicle);
  let score = 0;

  for (const token of tokens) {
    if (token.length < 2 || !text.includes(token)) continue;

    if (/^\d{1,2}er(?:\s|$)/.test(token) || token.endsWith(" reihe")) {
      score += 4;
      continue;
    }
    if (token.includes("klasse")) {
      score += 4;
      continue;
    }
    if (token === "gti" || token.includes("golf")) {
      score += 3;
      continue;
    }
    if (token.length >= 5) {
      score += 3;
      continue;
    }
    score += 2;
  }

  return score;
}
