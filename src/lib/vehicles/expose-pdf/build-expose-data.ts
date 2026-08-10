import {
  filterManualVehicleEntries,
  parseManualEntryCategory,
} from "@/lib/documents/manual-entries";
import { isVatLineItem } from "@/lib/ocr/invoice-vat";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import {
  TIMELINE_CATEGORY_LABELS,
  type TimelineEvent,
} from "@/lib/validations/timelineSchema";
import type { Document, Vehicle } from "@/types/database";

import {
  fetchDynoChartImage,
  fetchGalleryImages,
  fetchHeroImage,
} from "./fetch-expose-images";
import {
  buildPublicProfileUrl,
  formatCurrencyEur,
  formatGermanDate,
  formatMileageKm,
  formatPower,
  fallbackText,
} from "./formatters";
import type {
  ExposeMaintenanceRow,
  ExposeModificationRow,
  ExposePdfData,
} from "./types";

const LABOR_LABEL =
  /^(?:arbeitslohn|arbeitszeit|montage|demontage|kleinmaterial|entsorgung|material)$/i;

const SKIP_INVOICE_LINE =
  /^(?:summe|gesamt|netto|brutto|zwischensumme|position(?:en)?)$/i;

function latestMileageKm(documents: Document[]): number | null {
  let best: number | null = null;
  for (const doc of documents) {
    const km = doc.mileage_km;
    if (km == null || !Number.isFinite(km)) continue;
    if (best == null || km > best) best = km;
  }
  return best;
}

function shouldIncludeInvoiceLine(label: string): boolean {
  const trimmed = label.trim();
  if (trimmed.length < 2) return false;
  if (isVatLineItem({ label: trimmed, amount: 0 })) return false;
  if (LABOR_LABEL.test(trimmed)) return false;
  if (SKIP_INVOICE_LINE.test(trimmed)) return false;
  return true;
}

function tuevStatusFromDocument(document: Document): string {
  const fields = document.approval_fields;
  if (fields && "result" in fields && typeof fields.result === "string") {
    const result = fields.result.trim();
    if (result.length > 0) return result;
  }
  return "HU durchgeführt";
}

function latestTuevStatus(documents: Document[]): string {
  const tuevDocs = documents
    .filter((doc) => doc.type === "tuev")
    .sort((a, b) =>
      (b.date ?? b.created_at).localeCompare(a.date ?? a.created_at),
    );

  if (tuevDocs.length === 0) return "Kein TÜV-Beleg hinterlegt";
  return tuevStatusFromDocument(tuevDocs[0]!);
}

function buildMaintenanceRows(
  timeline: TimelineEvent[],
  documents: Document[],
): ExposeMaintenanceRow[] {
  const docById = new Map(documents.map((doc) => [doc.id, doc]));
  const latestTuev = latestTuevStatus(documents);

  return timeline.slice(0, 14).map((event) => {
    const linked = event.documentId
      ? docById.get(event.documentId)
      : undefined;
    const workshop =
      linked?.vendor?.trim() ||
      event.description?.trim() ||
      "—";

    let tuevStatus = "—";
    if (event.category === "tuev") {
      tuevStatus = linked ? tuevStatusFromDocument(linked) : latestTuev;
    }

    return {
      date: formatGermanDate(event.date),
      mileageKm: event.mileage,
      workshop: fallbackText(workshop),
      service: TIMELINE_CATEGORY_LABELS[event.category],
      tuevStatus,
    };
  });
}

function extractModificationsFromAbe(
  documents: Document[],
  hideFinancials: boolean,
): ExposeModificationRow[] {
  return documents
    .filter((doc) => doc.type === "abe")
    .sort((a, b) =>
      (b.date ?? b.created_at).localeCompare(a.date ?? a.created_at),
    )
    .map((doc) => ({
      category: fallbackText(doc.part_category ?? "ABE / Gutachten"),
      partName: fallbackText(doc.title),
      manufacturer: fallbackText(doc.manufacturer),
      kbaNumber: fallbackText(doc.kba_number),
      approvalStatus: fallbackText(doc.authority ?? "ABE vorhanden"),
      installationDate: formatGermanDate(doc.date),
      amount: hideFinancials ? null : doc.amount,
    }));
}

function extractModificationsFromInvoices(
  documents: Document[],
  hideFinancials: boolean,
): ExposeModificationRow[] {
  const rows: ExposeModificationRow[] = [];
  const seen = new Set<string>();

  const invoices = documents
    .filter((doc) => doc.type === "invoice")
    .sort((a, b) =>
      (b.date ?? b.created_at).localeCompare(a.date ?? a.created_at),
    );

  for (const doc of invoices) {
    for (const item of doc.line_items ?? []) {
      if (!shouldIncludeInvoiceLine(item.label)) continue;
      const key = item.label.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      rows.push({
        category: fallbackText(doc.category ?? "Tuning / Teile"),
        partName: item.label.trim(),
        manufacturer: fallbackText(doc.vendor),
        kbaNumber: "—",
        approvalStatus: "Rechnung",
        installationDate: formatGermanDate(doc.date),
        amount: hideFinancials ? null : item.amount,
      });
    }
  }

  return rows;
}

function extractModificationsFromManualEntries(
  documents: Document[],
  hideFinancials: boolean,
): ExposeModificationRow[] {
  const rows: ExposeModificationRow[] = [];

  for (const entry of filterManualVehicleEntries(documents)) {
    const category = parseManualEntryCategory(entry.category);
    if (category !== "tuning") continue;

    rows.push({
      category: "Manueller Eintrag",
      partName: fallbackText(entry.title),
      manufacturer: fallbackText(entry.vendor),
      kbaNumber: "—",
      approvalStatus: "Eintrag",
      installationDate: formatGermanDate(entry.date ?? entry.created_at),
      amount: hideFinancials ? null : entry.amount,
    });
  }

  return rows;
}

function buildVehicleSubtitle(
  vehicle: Vehicle,
  modificationCount: number,
): string {
  const specs = parseVehicleTechSpecs(vehicle.tech_specs);
  if (specs.notes?.trim()) return specs.notes.trim();
  if (modificationCount > 0) return "Performance Build";
  return "Gepflegtes Fahrzeug mit dokumentierter Historie";
}

function sumModificationAmounts(rows: ExposeModificationRow[]): number | null {
  let total = 0;
  let hasAmount = false;
  for (const row of rows) {
    if (row.amount == null || !Number.isFinite(row.amount)) continue;
    total += row.amount;
    hasAmount = true;
  }
  return hasAmount ? total : null;
}

export type BuildExposePdfDataInput = {
  vehicle: Vehicle;
  documents: Document[];
  timeline: TimelineEvent[];
  sellerContact: string;
  qrCodeDataUri: string;
};

/** Aggregate vehicle twin data and resolve image buffers for PDF rendering. */
export async function buildExposePdfData(
  input: BuildExposePdfDataInput,
): Promise<ExposePdfData> {
  const { vehicle, documents, timeline, sellerContact, qrCodeDataUri } = input;
  const hideFinancials = vehicle.hide_financials !== false;
  const specs = parseVehicleTechSpecs(vehicle.tech_specs);
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`.trim();

  const abeMods = extractModificationsFromAbe(documents, hideFinancials);
  const invoiceMods = extractModificationsFromInvoices(documents, hideFinancials);
  const manualMods = extractModificationsFromManualEntries(
    documents,
    hideFinancials,
  );

  const modifications = [...abeMods, ...manualMods, ...invoiceMods].sort(
    (a, b) =>
      b.installationDate.localeCompare(a.installationDate, "de-DE"),
  );

  const modificationTotal = hideFinancials
    ? null
    : sumModificationAmounts(modifications);

  const [heroImage, galleryImages, dynoResult] = await Promise.all([
    fetchHeroImage(vehicle.id, vehicleLabel, vehicle.silhouette_image_url),
    fetchGalleryImages(vehicle.id, documents, 4),
    fetchDynoChartImage(vehicle.id),
  ]);

  const valueLabel = hideFinancials
    ? "Auf Anfrage"
    : modificationTotal != null
      ? formatCurrencyEur(modificationTotal)
      : "—";

  return {
    generatedAt: new Date().toISOString(),
    vehicleTitle: vehicleLabel,
    vehicleSubtitle: buildVehicleSubtitle(vehicle, modifications.length),
    publicProfileUrl: buildPublicProfileUrl(vehicle.public_slug),
    qrCodeDataUri,
    hideFinancials,
    sellerContact: fallbackText(sellerContact),
    metrics: {
      powerLabel: formatPower(specs.powerPs, specs.powerKw),
      mileageLabel: formatMileageKm(latestMileageKm(documents)),
      yearLabel:
        vehicle.year != null ? String(vehicle.year) : "—",
      valueLabel,
    },
    specs: {
      vin: fallbackText(vehicle.vin),
      hsnTsn: "—",
      engine: fallbackText(specs.engine),
      gearbox: fallbackText(specs.transmission),
      fuel: fallbackText(specs.fuelType),
      color: fallbackText(specs.color),
      previousOwners: "—",
      drivetrain: fallbackText(specs.drivetrain),
      bodyType: fallbackText(specs.bodyType),
      torqueLabel:
        specs.torqueNm != null ? `${Math.round(specs.torqueNm)} Nm` : "—",
    },
    latestTuevStatus: latestTuevStatus(documents),
    maintenanceRows: buildMaintenanceRows(timeline, documents),
    modifications,
    modificationTotal,
    heroImage,
    galleryImages,
    dynoChartImage: dynoResult.image,
    dynoChartPdfNote: dynoResult.pdfNote,
  };
}
