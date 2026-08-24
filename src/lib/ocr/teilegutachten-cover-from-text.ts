import {
  extractTeilegutachtenModificationTypeFromText,
  mergeTeilegutachtenModificationType,
  normalizeTeilegutachtenModificationType,
} from "@/lib/ocr/teilegutachten-modification-type-from-text";
import { normalizeAbeVehicleApprovals } from "@/lib/ocr/abe-parse-schema";
import type { TeilegutachtenExtraction } from "@/lib/validations/teilegutachtenSchema";

const COMMON_FIELD_END =
  /\n\s*(?:Fz\.?\s*-?\s*Teile|Für\s+Fz|Hersteller|Gutachten|Kennzeichnung|Verwendungsbereich|Technische\s+Daten|Prüforganisation)\b/i;

const FAHRZEUGTEIL_FIELD_END =
  /\n\s*(?:Art\s+der\s+Umr|Fz\.?\s*-?\s*Teile|Für\s+Fz|Hersteller|Gutachten|Kennzeichnung|Verwendungsbereich|Technische\s+Daten|Prüforganisation)\b/i;

function linesUntilStop(body: string, stopAt: RegExp): string | null {
  const lines: string[] = [];
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (stopAt.test(`\n${line}`)) break;
    lines.push(line);
  }
  if (lines.length === 0) return null;
  return normalizeTeilegutachtenModificationType(lines.join("\n"));
}

function extractInline(label: RegExp, text: string): string | null {
  const match = text.match(label);
  const value = match?.[1]?.trim();
  if (!value || value.length < 2) return null;
  return normalizeTeilegutachtenModificationType(value);
}

/** Fahrzeugteil — complete part description on cover page I. */
export function extractTeilegutachtenFahrzeugteilFromText(
  rawText: string,
): string | null {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (text.length < 8) return null;

  const heading = text.match(/(?:^|\n)\s*Fahrzeugteil\b\s*(?:[:\-|]\s*)?/i);
  if (heading?.index !== undefined) {
    const tail = text.slice(heading.index + heading[0].length);
    const endAt = tail.search(FAHRZEUGTEIL_FIELD_END);
    const body = (endAt >= 0 ? tail.slice(0, endAt) : tail.slice(0, 1_500)).trim();
    const fromBody = linesUntilStop(body, FAHRZEUGTEIL_FIELD_END);
    if (fromBody) return fromBody;
  }

  return extractInline(/(?:^|\n)\s*Fahrzeugteil\b\s*[:\-|]\s*([^\n]+)/i, text);
}

/** Art der Umrüstung — modification description when labeled separately on cover. */
export function extractTeilegutachtenArtDerUmruestungFromText(
  rawText: string,
): string | null {
  return extractTeilegutachtenModificationTypeFromText(rawText);
}

function combineCoverModificationFields(
  fahrzeugteil: string | null | undefined,
  artDerUmruestung: string | null | undefined,
): string | null {
  const fz = normalizeTeilegutachtenModificationType(fahrzeugteil);
  const art = normalizeTeilegutachtenModificationType(artDerUmruestung);

  if (!fz && !art) return null;
  if (!fz) return art;
  if (!art) return fz;
  if (fz.includes(art) || art.includes(fz)) {
    return fz.length >= art.length ? fz : art;
  }
  return normalizeTeilegutachtenModificationType(`${fz}\n${art}`);
}

/** Fz.-Teile Type / Fz-Teile Type — exact part type id. */
export function extractTeilegutachtenPartTypeFromText(
  rawText: string,
): string | null {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  const match =
    text.match(
      /(?:^|\n)\s*Fz\.?\s*-?\s*Teile(?:typ|n)?(?:\s*Type)?\b\s*[:\-|]\s*([^\n]+)/i,
    ) ??
    text.match(/(?:^|\n)\s*Teiletyp\b\s*[:\-|]\s*([^\n]+)/i);

  const value = match?.[1]?.trim();
  if (!value || value.length < 2) return null;
  return value.slice(0, 160);
}

/** Für Fz-Typen — compatible vehicle types (plain list). */
export function extractTeilegutachtenFuerFzTypenFromText(
  rawText: string,
): string | null {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  const heading = text.match(
    /(?:^|\n)\s*Für\s+Fz\.?\s*-?\s*Typen\b\s*(?:[:\-|]\s*)?/i,
  );
  if (heading?.index !== undefined) {
    const tail = text.slice(heading.index + heading[0].length);
    const endAt = tail.search(COMMON_FIELD_END);
    const body = (endAt >= 0 ? tail.slice(0, endAt) : tail.slice(0, 2_000)).trim();
    const fromBody = linesUntilStop(body, COMMON_FIELD_END);
    if (fromBody) return fromBody;
  }

  return extractInline(/(?:^|\n)\s*für\s+Fahrzeugtypen\b\s*[:\-|]\s*([^\n]+)/i, text);
}

export function vehicleApprovalsFromFuerFzTypen(
  value: string | null | undefined,
): string[] | null {
  if (!value?.trim()) return null;

  const lines = value
    .split(/\n|[;,]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2);

  const normalized = normalizeAbeVehicleApprovals(lines) ?? [];
  return normalized.length > 0 ? normalized : null;
}

/** Hersteller / Herstellerzeichen on cover page. */
export function extractTeilegutachtenHerstellerFromText(
  rawText: string,
): string | null {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  const match =
    text.match(
      /(?:^|\n)\s*Hersteller(?:zeichen)?\b\s*[:\-|]\s*([^\n|]+)/i,
    ) ?? text.match(/\|\s*Hersteller(?:zeichen)?\s*\|\s*([^|\n]+?)\s*\|/i);

  const value = match?.[1]?.trim();
  if (!value || value.length < 2) return null;
  return value.slice(0, 120);
}

export function enrichTeilegutachtenCoverFromOcr(
  extracted: TeilegutachtenExtraction,
  ocrText: string,
): TeilegutachtenExtraction {
  const fahrzeugteil = extractTeilegutachtenFahrzeugteilFromText(ocrText);
  const artDerUmruestung =
    extractTeilegutachtenArtDerUmruestungFromText(ocrText);
  const partType =
    extracted.partType?.trim() ||
    extractTeilegutachtenPartTypeFromText(ocrText);
  const fuerFzTypen = extractTeilegutachtenFuerFzTypenFromText(ocrText);
  const manufacturer =
    extracted.manufacturer?.trim() ||
    extractTeilegutachtenHerstellerFromText(ocrText);

  const coverModification = combineCoverModificationFields(
    fahrzeugteil,
    artDerUmruestung,
  );
  const modificationType = mergeTeilegutachtenModificationType(
    extracted.modificationType,
    coverModification,
  );

  const verwendungsbereich =
    extracted.verwendungsbereich?.trim() ||
    (fuerFzTypen && !extracted.compatibilityTable?.rows?.length
      ? fuerFzTypen
      : null);

  return {
    ...extracted,
    manufacturer: manufacturer || extracted.manufacturer,
    modificationType: modificationType || extracted.modificationType,
    partCategory:
      extracted.partCategory?.trim() ||
      fahrzeugteil?.split("\n")[0]?.trim() ||
      extracted.partCategory,
    partType: partType || extracted.partType,
    verwendungsbereich: verwendungsbereich || extracted.verwendungsbereich,
  };
}
