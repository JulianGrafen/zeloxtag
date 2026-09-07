import {
  detectOilChangeInvoice,
  ensureOilChangeNotes,
  isOilChangeDocument,
  isOilChangeSelfMadeVendor,
  resolveOilChangeVendor,
} from "@/lib/documents/oil-changes";
import { isManualVehicleEntry } from "@/lib/documents/manual-entries";
import type { Document } from "@/types/database";

export type ManualOilChangeFormValues = {
  date: string;
  mileageKm: string;
  selfMade: boolean;
  vendor: string;
  oilSpec: string;
  oilLiters: string;
  filterChanged: boolean;
  notes: string;
};

export type ManualOilChangeFormInput = {
  date?: string;
  mileageKm?: string;
  selfMade?: boolean;
  vendor?: string;
  oilSpec?: string;
  oilAmountLiters?: string;
  filterChanged?: boolean | string;
  notes?: string;
  title?: string;
};

function parseOilLitersInput(raw: string | undefined): number | null {
  const litersRaw = raw?.trim() ?? "";
  if (!litersRaw) return null;
  const value = Number.parseFloat(litersRaw.replace(",", "."));
  if (!Number.isFinite(value) || value <= 0 || value > 20) return null;
  return Math.round(value * 10) / 10;
}

/** Build persisted title/notes for a manual Ölwechsel log. */
export function buildManualOilChangeDocumentFields(
  input: ManualOilChangeFormInput,
): { category: "service"; title: string; notes: string | null } {
  const oilSpec = input.oilSpec?.trim() || null;
  const oilAmountLiters = parseOilLitersInput(input.oilAmountLiters);
  const filterChanged =
    input.filterChanged === true || input.filterChanged === "true";
  const userNotes = input.notes?.trim() ?? "";

  const parts = ["Ölwechsel"];
  if (oilSpec) parts.push(oilSpec);
  if (oilAmountLiters) {
    parts.push(`${oilAmountLiters.toLocaleString("de-DE")} l`);
  }
  parts.push(filterChanged ? "Filter gewechselt" : "Filter unklar");
  if (userNotes) parts.push(userNotes);

  const blob = parts.join(" · ");
  const detected = detectOilChangeInvoice({
    title: "Ölwechsel",
    notes: blob,
    category: "service",
  });

  return {
    category: "service",
    title: input.title?.trim() || "Ölwechsel",
    notes: ensureOilChangeNotes(blob, detected),
  };
}

function extractUserNotesFromOilBlob(
  notes: string | null | undefined,
  detected: ReturnType<typeof detectOilChangeInvoice>,
): string {
  if (!notes?.trim()) return "";
  const parts = notes.split(" · ").map((part) => part.trim()).filter(Boolean);
  const skip = new Set(["Ölwechsel", "Filter gewechselt", "Filter unklar"]);

  const kept = parts.filter((part) => {
    if (skip.has(part)) return false;
    if (detected.oilSpec && part === detected.oilSpec) return false;
    if (
      detected.oilAmountLiters != null &&
      part === `${detected.oilAmountLiters.toLocaleString("de-DE")} l`
    ) {
      return false;
    }
    if (/^\d+(?:[.,]\d+)?\s*l$/i.test(part)) return false;
    return true;
  });

  return kept.join(" · ");
}

/** Prefill the Ölwechsel form from a stored document row. */
export function manualOilChangeFormFromDocument(
  document: Document,
): ManualOilChangeFormValues {
  const detected = detectOilChangeInvoice({
    title: document.title,
    vendor: document.vendor,
    category: document.category,
    notes: document.notes,
    lineItems: document.line_items,
  });
  const selfMade = isOilChangeSelfMadeVendor(document.vendor);
  const filterChanged = document.notes?.includes("Filter unklar")
    ? false
    : detected.filterChanged;

  return {
    date: document.date ?? document.created_at.slice(0, 10),
    mileageKm:
      document.mileage_km != null && Number.isFinite(document.mileage_km)
        ? String(document.mileage_km)
        : "",
    selfMade,
    vendor: selfMade ? "" : document.vendor?.trim() ?? "",
    oilSpec: detected.oilSpec ?? "",
    oilLiters:
      detected.oilAmountLiters != null
        ? String(detected.oilAmountLiters)
        : "",
    filterChanged,
    notes: extractUserNotesFromOilBlob(document.notes, detected),
  };
}

export function isEditableManualOilChangeDocument(document: Document): boolean {
  return isManualVehicleEntry(document) && isOilChangeDocument(document);
}

export function manualOilChangeFieldsFromFormData(formData: FormData) {
  return {
    entryType: String(formData.get("entryType") ?? ""),
    selfMade: String(formData.get("selfMade") ?? ""),
    oilSpec: String(formData.get("oilSpec") ?? ""),
    oilAmountLiters: String(formData.get("oilAmountLiters") ?? ""),
    filterChanged: String(formData.get("filterChanged") ?? ""),
  };
}

export function resolveManualOilChangeVendor(
  selfMadeRaw: string,
  vendorRaw: string | undefined,
): string | null {
  return resolveOilChangeVendor(selfMadeRaw === "true", vendorRaw);
}

export function manualOilChangeEditPath(
  tagUuid: string,
  documentId: string,
): string {
  return `/v/${tagUuid}/intervalle?edit=${encodeURIComponent(documentId)}`;
}
