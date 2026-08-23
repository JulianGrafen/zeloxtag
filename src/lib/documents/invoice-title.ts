/**
 * Dashboard titles for invoices — prefer the dominant work,
 * not incidental add-ons (e.g. oil change during tuning).
 */

import type { OilChangeDetection } from "./oil-changes";
import type { DocumentLineItem } from "@/types/database";
import type { InvoiceTextParseCategory } from "@/lib/ocr/text-parse-schema";

const VAT_OR_TOTAL =
  /(?:^|[^A-Za-z0-9_])(?:mwst|m\.?\s*w\.?\s*st\.?|ust\.?|umsatzsteuer|vat|steuer|summe|gesamt|netto|brutto|zahlbetrag)(?:[^A-Za-z0-9_]|$)/i;

const OIL_LINE =
  /(?:öl[-\s]*wechsel|oel[-\s]*wechsel|ol[-\s]*wechsel|motoröl|motoroel|motorol|ölfilter|oelfilter|olfilter|oil\s*filter|engine\s*oil|(?:5|0|10|15)w-?\d{2})/i;

const TUNING_LINE =
  /(?:^|[^A-Za-z0-9_])(?:sportfedern?|federn?|fahrwerk|gewindefahrwerk|downpipe|sportauspuff|auspuff|abgasanlage|intercooler|chiptuning|remap|stage\s*[1-3]|felgen?|leichtmetallr|spoiler|frontlippe|diffuser|seitenschweller|ladedruck|turbolader\s*upgrade|tuning)(?:[^A-Za-z0-9_]|$)/i;

const REPAIR_LINE =
  /(?:^|[^A-Za-z0-9_])(?:reparatur|instandsetzung|unfall|karosserie|lackierung|getriebe|kupplung|bremsen?|bremsscheiben|querlenker|stoßdämpfer|stossdaempfer|zahnriemen|steuerkette|defekt|schaden)(?:[^A-Za-z0-9_]|$)/i;

const OIL_ADJUNCT =
  /(?:^|[^A-Za-z0-9_])(?:entsorgung|umwelt|kleinmaterial|altöl|altol)(?:[^A-Za-z0-9_]|$)/i;

/** Consumables / wear parts — not dominant workshop labor for titles. */
const CONSUMABLE_LINE =
  /(?:^|[^A-Za-z0-9_])(?:luftfilter|pollenfilter|innenraumfilter|kabinenfilter|kraftstofffilter|dieselfilter|zündkerzen?|zuendkerzen?|kerzen|bremsflüssigkeit|bremsfluessigkeit|kühlmittel|kuehlmittel|scheibenwisch|wischwasser|adblue|filter\s*element|verschleiß|verschleiss)(?:[^A-Za-z0-9_]|$)/i;

export type InvoiceTitleInput = {
  summary?: string | null;
  vendor?: string | null;
  category?: InvoiceTextParseCategory | string | null;
  lineItems?: DocumentLineItem[] | null;
  rawText?: string | null;
  oil?: OilChangeDetection | null;
};

function cleanTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 160);
}

function billableItems(items: DocumentLineItem[] | null | undefined): DocumentLineItem[] {
  return (items ?? []).filter((item) => !VAT_OR_TOTAL.test(item.label));
}

const SERVICE_LINE =
  /(?:^|[^A-Za-z0-9_])(?:inspektion|wartung|service|hu\b|hauptuntersuchung|reifenwechsel|achsvermessung)(?:[^A-Za-z0-9_]|$)/i;

function isOilAdjacentLine(label: string): boolean {
  return OIL_LINE.test(label) || OIL_ADJUNCT.test(label);
}

function isConsumableLine(label: string): boolean {
  return CONSUMABLE_LINE.test(label);
}

/** True when the line describes main workshop work (not oil/consumables/tax). */
function isMainWorkLine(label: string): boolean {
  if (VAT_OR_TOTAL.test(label)) return false;
  if (isOilAdjacentLine(label)) return false;
  if (isConsumableLine(label)) return false;
  return true;
}

function firstMainWorkLine(
  items: DocumentLineItem[],
): DocumentLineItem | null {
  for (const item of items) {
    if (isMainWorkLine(item.label)) return item;
  }
  return null;
}

/**
 * Oil change is primary only when it is the sole job — not a side line on Inspektion/Reparatur.
 */
export function isPrimaryOilChange(input: InvoiceTitleInput): boolean {
  const oil = input.oil;
  if (!oil?.isOilChange) return false;

  const items = billableItems(input.lineItems);
  if (items.length === 0) {
    return /öl[-\s]*wechsel|oil\s*change/i.test(
      [input.summary, input.rawText].filter(Boolean).join("\n"),
    );
  }

  return items.every((item) => !isMainWorkLine(item.label));
}

function shortenLabel(label: string): string {
  return cleanTitle(
    label
      .replace(/^\d+[\).:\s-]+/, "")
      .replace(/\s+/g, " ")
      .slice(0, 48),
  );
}

/**
 * Build a dashboard-friendly invoice title from the dominant work.
 */
export function buildInvoiceDashboardTitle(input: InvoiceTitleInput): string {
  const items = billableItems(input.lineItems);
  const category = (input.category ?? "other") as InvoiceTextParseCategory;
  const summary = input.summary?.trim() || "";
  const oilPrimary = isPrimaryOilChange(input);

  if (oilPrimary && input.oil?.title) {
    return cleanTitle(input.oil.title);
  }

  const summaryLooksOilOnly =
    /öl[-\s]*wechsel|oel[-\s]*wechsel|ol[-\s]*wechsel/i.test(summary) &&
    !TUNING_LINE.test(summary) &&
    !REPAIR_LINE.test(summary) &&
    !SERVICE_LINE.test(summary);

  // Betreff / OCR summary wins when oil is only incidental side work.
  const usableBetreff =
    summary && !(summaryLooksOilOnly && input.oil?.isOilChange && !oilPrimary)
      ? summary
      : "";
  if (usableBetreff) {
    return cleanTitle(usableBetreff);
  }

  const leadMain = firstMainWorkLine(items);
  if (leadMain) {
    const base = shortenLabel(leadMain.label);
    const hasOilSide = items.some((item) => isOilAdjacentLine(item.label));
    if (hasOilSide && SERVICE_LINE.test(leadMain.label)) {
      if (/inspektion/i.test(base) && !/öl|oel|ol/i.test(base)) {
        return cleanTitle(`${base} inkl. Ölwechsel`);
      }
    }
    return base;
  }

  const sorted = [...items].sort(
    (a, b) => Math.abs(b.amount) - Math.abs(a.amount),
  );

  const tuningItems = sorted.filter((item) => TUNING_LINE.test(item.label));
  const repairItems = sorted.filter((item) => REPAIR_LINE.test(item.label));
  const serviceItems = sorted.filter(
    (item) => SERVICE_LINE.test(item.label) && !OIL_LINE.test(item.label),
  );

  if (category === "tuning" || tuningItems.length > 0) {
    const materialTuning = tuningItems.filter(
      (item) =>
        !/(?:^|[^A-Za-z0-9_])(?:arbeitslohn|arbeitszeit|montage|einbau|ausbau)(?:[^A-Za-z0-9_]|$)/i.test(
          item.label,
        ),
    );
    const lead =
      materialTuning[0] ??
      tuningItems[0] ??
      sorted.find((item) => !OIL_LINE.test(item.label));
    if (lead) {
      const second = materialTuning.find(
        (item) =>
          item.label !== lead.label && item.amount >= lead.amount * 0.35,
      );
      if (second) {
        return cleanTitle(
          `${shortenLabel(lead.label)} · ${shortenLabel(second.label)}`,
        );
      }
      return shortenLabel(lead.label);
    }
  }

  if (category === "repair" || (repairItems.length > 0 && repairItems[0])) {
    return shortenLabel(repairItems[0]?.label ?? sorted[0]?.label ?? "Reparatur");
  }

  if (category === "service" || serviceItems.length > 0) {
    const lead = serviceItems[0] ?? sorted.find((item) => !OIL_LINE.test(item.label));
    if (lead) return shortenLabel(lead.label);
  }

  const lead = sorted.find((item) => !OIL_LINE.test(item.label)) ?? sorted[0];
  if (lead) return shortenLabel(lead.label);

  return cleanTitle(input.vendor?.trim() || "Rechnung");
}
