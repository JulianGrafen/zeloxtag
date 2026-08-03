/**
 * Heuristic extraction of ABE technical specs / Maßcodes from OCR text.
 * Captures cryptic alphanumeric + diameter (Ø) combinations, ET, Felgenmaße, …
 */

import type { AbeTechnicalSpec } from "./abe-parse-schema";
import {
  TECHNICAL_SPEC_LABEL_MAX,
  TECHNICAL_SPEC_MAX_ITEMS,
  TECHNICAL_SPEC_VALUE_MAX,
} from "@/lib/documents/technical-specs";

/** Diameter glyphs + common OCR misreads (phi, …). */
const DIAMETER = String.raw`[Ø⌀øØφΦ]`;

const MAX_ITEMS = TECHNICAL_SPEC_MAX_ITEMS;

type SpecCandidate = AbeTechnicalSpec & { priority: number };

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Normalize Ø-values for dedupe: "Ø 67,1 mm" → "ø67,1mm". */
function fingerprintValue(value: string): string {
  return clean(value)
    .toLowerCase()
    .replace(/[Ø⌀øØφΦ]/g, "ø")
    .replace(/\s+/g, "");
}

function pushUnique(
  out: SpecCandidate[],
  seen: Set<string>,
  label: string,
  value: string,
  priority: number,
) {
  const normalizedLabel = clean(label).slice(0, TECHNICAL_SPEC_LABEL_MAX);
  const normalizedValue = clean(value).slice(0, TECHNICAL_SPEC_VALUE_MAX);
  if (!normalizedLabel || !normalizedValue) return;
  if (normalizedValue.length < 2) return;

  const key = `${normalizedLabel.toLowerCase()}|${fingerprintValue(normalizedValue)}`;
  if (seen.has(key)) return;

  // Dedupe identical measure values regardless of label wording.
  const fp = fingerprintValue(normalizedValue);
  const valueKey = `*|${fp}`;
  if (seen.has(valueKey)) return;

  // Skip diameter-only values already contained in a richer Maßcode.
  if (
    normalizedLabel === "Durchmesser" &&
    [...seen].some((entry) => entry.startsWith("*|") && entry.includes(fp))
  ) {
    return;
  }

  // ET "35" vs "35 mm"
  const etDigits = normalizedValue.match(/^(-?\d{1,3})\s*mm$/i);
  if (etDigits?.[1] && seen.has(`*|${etDigits[1]}`)) return;
  if (/^-?\d{1,3}$/.test(normalizedValue) && seen.has(`*|${normalizedValue}mm`)) {
    return;
  }

  seen.add(key);
  seen.add(valueKey);
  out.push({
    label: normalizedLabel,
    value: normalizedValue,
    priority,
  });
}

/**
 * Pull technical dimensions / cryptic Ø-codes from ABE OCR text.
 */
export function extractAbeTechnicalSpecsFromText(
  rawText: string,
): AbeTechnicalSpec[] | null {
  const text = rawText.replace(/\r\n/g, "\n");
  const out: SpecCandidate[] = [];
  const seen = new Set<string>();

  // Labeled lines: "Durchmesser: Ø 18" / "ET: 35" / "Lochkreis 5x114,3"
  for (const match of text.matchAll(
    /(?:^|\n)\s*([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9 /().\-]{1,40}?)\s*[=:]\s*([^\n]{2,80})/g,
  )) {
    const label = clean(match[1] ?? "");
    const value = clean(match[2] ?? "");
    if (!label || !value) continue;
    if (/seite|page|datum|tel|fax|unterschrift|verwendungsbereich/i.test(label)) {
      continue;
    }
    if (
      !/(durchmesser|einpresstiefe|\bet\b|breite|höhe|länge|gewicht|lochkreis|\blk\b|mittenloch|\bml\b|nabe|zentrum|felge|größe|abmessung|maß|federweg|gewinde|ø|⌀)/i.test(
        `${label} ${value}`,
      ) &&
      !new RegExp(DIAMETER).test(value) &&
      !/\d/.test(value)
    ) {
      continue;
    }
    // Skip prose Auflagen mistaken as labels.
    if (value.length > 90 || / darf | nicht | ausschließlich /i.test(value)) {
      continue;
    }
    pushUnique(out, seen, inferLabel(label, value), value, 10);
  }

  // Named measures first (so Ø under "Mittenloch" is not stored as bare Durchmesser).
  for (const match of text.matchAll(
    /\b(?:ET|Einpresstiefe)\s*[=:]?\s*(-?\d{1,3})\b/gi,
  )) {
    const value = clean(match[1] ?? "");
    if (!value) continue;
    pushUnique(out, seen, "Einpresstiefe (ET)", `${value} mm`, 8);
  }

  for (const match of text.matchAll(
    /\b(?:LK|Lochkreis|PCD)\s*[=:]?\s*(\d\s*[x×]\s*\d{2,3}(?:[.,]\d)?)\b/gi,
  )) {
    const value = clean(match[1] ?? "");
    if (!value) continue;
    pushUnique(out, seen, "Lochkreis", value, 8);
  }

  for (const match of text.matchAll(
    new RegExp(
      String.raw`\b(?:ML|Mittenloch|Nabenbohrung|Zentrumsbohrung|Zentrumsloch)\s*[=:]?\s*(?:${DIAMETER}\s*)?(\d+(?:[.,]\d+)?(?:\s*mm)?)`,
      "gi",
    ),
  )) {
    const value = clean(match[1] ?? "");
    if (!value) continue;
    const withUnit = /\d\s*mm$/i.test(value) ? value : `${value} mm`;
    pushUnique(out, seen, "Mittenloch", `Ø${withUnit.replace(/^Ø/i, "")}`, 9);
  }

  // Cryptic alphanumeric + diameter: e.g. "A12B Ø67,1", "M14x1,5Ø12", "8Jx18Ø72,6"
  // Require at least one digit so words like "Mittenloch Ø…" are not codes.
  for (const match of text.matchAll(
    new RegExp(
      String.raw`\b([A-Z0-9][A-Z0-9./\-x×*]{1,24})\s*(${DIAMETER})\s*(\d+(?:[.,]\d+)?(?:\s*(?:mm|cm|zoll|"))?)`,
      "gi",
    ),
  )) {
    const code = clean(match[1] ?? "");
    const glyph = match[2] ?? "Ø";
    const diameter = clean(match[3] ?? "");
    if (!code || !diameter) continue;
    if (!/\d/.test(code)) continue;
    if (/^(seite|page|kba|abe|eg)$/i.test(code)) continue;
    if (/mittenloch|nabenbohrung|zentrums/i.test(code)) continue;
    pushUnique(
      out,
      seen,
      "Maßcode",
      `${code} ${glyph}${diameter}`.replace(/\s+/g, " "),
      9,
    );
  }

  // Standalone diameter values: Ø 18" / Durchmesser Ø67,1 mm
  for (const match of text.matchAll(
    new RegExp(
      String.raw`(?:durchmesser\s*[=:]?\s*)?(${DIAMETER})\s*[=:]?\s*(\d+(?:[.,]\d+)?(?:\s*(?:mm|cm|zoll|"))?)`,
      "gi",
    ),
  )) {
    const full = match[0] ?? "";
    const index = match.index ?? 0;
    const prefix = text.slice(Math.max(0, index - 24), index);
    if (/mittenloch|nabenbohrung|zentrums|\bml\b/i.test(prefix + full)) {
      continue;
    }
    const glyph = match[1] ?? "Ø";
    const value = clean(match[2] ?? "");
    if (!value) continue;
    pushUnique(
      out,
      seen,
      "Durchmesser",
      `${glyph}${value}`.replace(/\s+/g, ""),
      7,
    );
  }

  // Wheel size: 8,5 J x 18 H2 / 8Jx18 ET35
  for (const match of text.matchAll(
    /\b(\d{1,2}(?:[.,]\d)?\s*J\s*[x×]\s*\d{2}(?:\s*H\d)?(?:\s*ET\s*-?\d{1,3})?)\b/gi,
  )) {
    const value = clean(match[1] ?? "");
    if (!value) continue;
    // Skip bare wheel size already covered by a Maßcode like "8Jx18 Ø67,1".
    const fp = fingerprintValue(value);
    if ([...seen].some((entry) => entry.startsWith("*|") && entry.includes(fp) && entry.includes("ø"))) {
      continue;
    }
    pushUnique(out, seen, "Felgengröße", value, 8);
  }

  // Tire size: 225/45 R17 (optional load index, but not a following "120 x …")
  for (const match of text.matchAll(
    /\b(\d{3}\s*\/\s*\d{2}\s*Z?R\s*\d{2})(?:\s+(\d{2,3})(?!\s*[x×]))?\b/gi,
  )) {
    const base = clean(match[1] ?? "");
    const load = match[2] ? clean(match[2]) : "";
    if (!base) continue;
    pushUnique(
      out,
      seen,
      "Reifengröße",
      load ? `${base} ${load}` : base,
      7,
    );
  }

  // Compact dimension triples: 120 x 80 x 40 mm / 1120×185×62
  for (const match of text.matchAll(
    /\b(\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?(?:\s*mm)?)\b/gi,
  )) {
    const value = clean(match[1] ?? "");
    if (!value) continue;
    pushUnique(out, seen, "Abmessungen", value, 6);
  }

  if (out.length === 0) return null;

  out.sort((a, b) => b.priority - a.priority);
  return out.slice(0, MAX_ITEMS).map(({ label, value }) => ({ label, value }));
}

function inferLabel(rawLabel: string, value: string): string {
  const label = clean(rawLabel);
  const hasDiameter = new RegExp(DIAMETER).test(value);
  const looksLikeCode =
    hasDiameter && /[A-Za-z]\d|\d[A-Za-z]|[x×*]/i.test(value);

  if (/^et\b|einpresstiefe/i.test(label)) return "Einpresstiefe (ET)";
  if (/mitten|nabe|zentrum|\bml\b/i.test(label)) return "Mittenloch";
  if (/durchmesser|^d\b/i.test(label)) return "Durchmesser";
  if (/lochkreis|^lk\b|pcd/i.test(label)) return "Lochkreis";
  if (/felge|radgr/i.test(label)) return "Felgengröße";
  if (/reifen/i.test(label)) return "Reifengröße";
  if (/gewicht|masse\b/i.test(label)) return "Gewicht";
  if (/breite/i.test(label)) return "Breite";
  if (/höhe/i.test(label)) return "Höhe";
  if (/länge|lange/i.test(label)) return "Länge";
  if (looksLikeCode || (/^maß/i.test(label) && hasDiameter)) return "Maßcode";
  if (/abmessung/i.test(label)) return "Abmessungen";
  if (hasDiameter) return "Durchmesser";
  return label.slice(0, TECHNICAL_SPEC_LABEL_MAX);
}

/** Prefer the richer technical-spec set (LLM vs heuristic), then union unique. */
export function preferAbeTechnicalSpecs(
  primary: AbeTechnicalSpec[] | null | undefined,
  fallback: AbeTechnicalSpec[] | null | undefined,
): AbeTechnicalSpec[] | null {
  const a = primary ?? [];
  const b = fallback ?? [];
  if (a.length === 0 && b.length === 0) return null;
  if (a.length === 0) return b.slice(0, MAX_ITEMS);
  if (b.length === 0) return a.slice(0, MAX_ITEMS);

  const merged: AbeTechnicalSpec[] = [];
  const seen = new Set<string>();

  for (const item of [...a, ...b]) {
    const label = clean(item.label).slice(0, TECHNICAL_SPEC_LABEL_MAX);
    const value = clean(item.value).slice(0, TECHNICAL_SPEC_VALUE_MAX);
    if (!label || !value) continue;
    const key = `${label.toLowerCase()}|${value.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ label, value });
    if (merged.length >= MAX_ITEMS) break;
  }

  return merged.length > 0 ? merged : null;
}
