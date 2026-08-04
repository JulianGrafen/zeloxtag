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

const SERVICE_LINE =
  /(?:^|[^A-Za-z0-9_])(?:inspektion|wartung|service|hu\b|hauptuntersuchung|reifenwechsel|achsvermessung)(?:[^A-Za-z0-9_]|$)/i;

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

function amountShare(
  items: DocumentLineItem[],
  predicate: (label: string) => boolean,
): number {
  const total = items.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  if (total <= 0) return 0;
  const matched = items
    .filter((item) => predicate(item.label))
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
  return matched / total;
}

function hasLine(
  items: DocumentLineItem[],
  pattern: RegExp,
): boolean {
  return items.some((item) => pattern.test(item.label));
}

/**
 * Oil change is primary only when it is the main job — not a side job on tuning/repair.
 */
export function isPrimaryOilChange(input: InvoiceTitleInput): boolean {
  const oil = input.oil;
  if (!oil?.isOilChange) return false;

  const items = billableItems(input.lineItems);
  const category = (input.category ?? "").toLowerCase();
  const blob = [input.summary, input.rawText, ...items.map((i) => i.label)]
    .filter(Boolean)
    .join("\n");

  const oilShare = amountShare(items, (label) => OIL_LINE.test(label));
  const tuningShare = amountShare(items, (label) => TUNING_LINE.test(label));
  const repairShare = amountShare(items, (label) => REPAIR_LINE.test(label));
  const hasTuning = hasLine(items, TUNING_LINE) || TUNING_LINE.test(blob);
  const hasRepair = hasLine(items, REPAIR_LINE) || REPAIR_LINE.test(blob);

  // Explicit non-service categories win unless oil clearly dominates the bill.
  if (category === "tuning" || category === "repair") {
    return oilShare >= 0.55 && oilShare > tuningShare && oilShare > repairShare;
  }

  if (hasTuning && tuningShare >= oilShare) return false;
  if (hasRepair && repairShare > oilShare) return false;

  // Dominant oil lines, or classic service invoice centered on oil.
  if (oilShare >= 0.4) return true;
  if (
    (category === "service" || category === "" || category === "other") &&
    !hasTuning &&
    !hasRepair &&
    oil.isOilChange
  ) {
    return true;
  }

  return false;
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

  // Drop oil-forced summaries when oil is only incidental.
  const summaryLooksOilOnly =
    /öl[-\s]*wechsel|oel[-\s]*wechsel|ol[-\s]*wechsel/i.test(summary) &&
    !TUNING_LINE.test(summary) &&
    !REPAIR_LINE.test(summary);
  const usableSummary =
    summary && !(summaryLooksOilOnly && input.oil?.isOilChange && !oilPrimary)
      ? summary
      : "";

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
    if (usableSummary && REPAIR_LINE.test(usableSummary)) {
      return cleanTitle(usableSummary);
    }
    return shortenLabel(repairItems[0]?.label ?? sorted[0]?.label ?? "Reparatur");
  }

  if (category === "service" || serviceItems.length > 0) {
    if (usableSummary && !summaryLooksOilOnly) {
      return cleanTitle(usableSummary);
    }
    const lead = serviceItems[0] ?? sorted.find((item) => !OIL_LINE.test(item.label));
    if (lead) return shortenLabel(lead.label);
  }

  if (usableSummary) {
    return cleanTitle(usableSummary);
  }

  const lead = sorted.find((item) => !OIL_LINE.test(item.label)) ?? sorted[0];
  if (lead) return shortenLabel(lead.label);

  return cleanTitle(input.vendor?.trim() || "Rechnung");
}
