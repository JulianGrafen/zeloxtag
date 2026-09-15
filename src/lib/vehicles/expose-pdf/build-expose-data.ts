import {
  latestTuevStatusLabel,
  resolveDocumentAmount,
  sanitizeExposeLabel,
  tuevStatusLabelFromDocument,
} from "@/lib/vehicles/expose-data";
import { sortTimelineEventsByMileage } from "@/services/timeline/TimelineService";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import {
  extractVehicleModifications,
  sumVehicleModificationAmounts,
} from "@/lib/vehicles/vehicle-modifications";
import {
  TIMELINE_CATEGORY_LABELS,
  type TimelineEvent,
  type TimelineEventCategory,
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

const MAINTENANCE_CATEGORIES = new Set<TimelineEventCategory>([
  "oil_change",
  "inspection",
  "repair",
  "tuev",
  "other",
]);

function latestMileageKm(documents: Document[]): number | null {
  let best: number | null = null;
  for (const doc of documents) {
    const km = doc.mileage_km;
    if (km == null || !Number.isFinite(km)) continue;
    if (best == null || km > best) best = km;
  }
  return best;
}

function workshopLabel(
  event: TimelineEvent,
  linked: Document | undefined,
): string {
  const fromDoc =
    (linked
      ? sanitizeExposeLabel(linked.vendor) ??
        sanitizeExposeLabel(linked.manufacturer)
      : null) ?? sanitizeExposeLabel(event.description);
  return fromDoc ?? "—";
}

function serviceLabel(event: TimelineEvent): string {
  const categoryLabel = TIMELINE_CATEGORY_LABELS[event.category];
  const title = sanitizeExposeLabel(event.title);
  if (!title) return categoryLabel;
  if (event.isManualEntry && title !== categoryLabel) return title;
  if (title !== categoryLabel) return title;
  return categoryLabel;
}

function isMaintenanceEvent(event: TimelineEvent): boolean {
  return MAINTENANCE_CATEGORIES.has(event.category);
}

function resolveMaintenanceAmount(
  event: TimelineEvent,
  linked: Document | undefined,
  hideFinancials: boolean,
): number | null {
  if (hideFinancials) return null;
  if (
    event.cost != null &&
    Number.isFinite(event.cost) &&
    event.cost > 0
  ) {
    return event.cost;
  }
  if (linked) return resolveDocumentAmount(linked);
  return null;
}

export function sumExposeMaintenanceAmounts(
  rows: ExposeMaintenanceRow[],
): number | null {
  let total = 0;
  let hasAmount = false;
  for (const row of rows) {
    if (row.amount == null || !Number.isFinite(row.amount)) continue;
    total += row.amount;
    hasAmount = true;
  }
  return hasAmount ? Math.round(total * 100) / 100 : null;
}

function sumDocumentedTotals(
  maintenanceTotal: number | null,
  modificationTotal: number | null,
): number | null {
  let total = 0;
  let hasAmount = false;
  if (maintenanceTotal != null && Number.isFinite(maintenanceTotal)) {
    total += maintenanceTotal;
    hasAmount = true;
  }
  if (modificationTotal != null && Number.isFinite(modificationTotal)) {
    total += modificationTotal;
    hasAmount = true;
  }
  return hasAmount ? Math.round(total * 100) / 100 : null;
}

/** Wartung & Servicehistorie rows for PDF (exported for tests). */
export function buildExposeMaintenanceRows(
  timeline: TimelineEvent[],
  documents: Document[],
  hideFinancials = true,
): ExposeMaintenanceRow[] {
  const docById = new Map(documents.map((doc) => [doc.id, doc]));
  const latestTuev = latestTuevStatusLabel(documents);

  const maintenanceEvents = sortTimelineEventsByMileage(
    timeline.filter(isMaintenanceEvent),
    "asc",
  );

  return maintenanceEvents.map((event) => {
    const linked = event.documentId
      ? docById.get(event.documentId)
      : undefined;

    let tuevStatus = "—";
    if (event.category === "tuev") {
      tuevStatus = linked
        ? tuevStatusLabelFromDocument(linked)
        : latestTuev;
    }

    return {
      date: formatGermanDate(event.date),
      mileageKm: event.mileage,
      mileageKnown: event.mileageKnown !== false,
      workshop: fallbackText(workshopLabel(event, linked)),
      service: serviceLabel(event),
      tuevStatus,
      amount: resolveMaintenanceAmount(event, linked, hideFinancials),
    };
  });
}

function mapModificationsToExposeRows(
  modifications: ReturnType<typeof extractVehicleModifications>,
): ExposeModificationRow[] {
  return modifications.map((mod) => ({
    category: fallbackText(mod.category),
    partName: fallbackText(mod.partName),
    manufacturer: fallbackText(mod.manufacturer),
    kbaNumber: fallbackText(mod.kbaNumber),
    approvalStatus: fallbackText(mod.approvalStatus),
    installationDate: formatGermanDate(mod.date),
    amount: mod.amount,
  }));
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

export type BuildExposePdfDataInput = {
  vehicle: Vehicle;
  documents: Document[];
  timeline: TimelineEvent[];
  sellerContact: string;
  qrCodeDataUri: string;
  /** Owner choice at export time (not public hide_financials). */
  includeFinancials: boolean;
};

/** Aggregate vehicle twin data and resolve image buffers for PDF rendering. */
export async function buildExposePdfData(
  input: BuildExposePdfDataInput,
): Promise<ExposePdfData> {
  const {
    vehicle,
    documents,
    timeline,
    sellerContact,
    qrCodeDataUri,
    includeFinancials,
  } = input;
  const hideFinancials = !includeFinancials;
  const specs = parseVehicleTechSpecs(vehicle.tech_specs);
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`.trim();

  const extractedMods = extractVehicleModifications(documents, {
    hideFinancials,
  });
  const modifications = mapModificationsToExposeRows(extractedMods);

  const modificationTotal = hideFinancials
    ? null
    : sumVehicleModificationAmounts(extractedMods);

  const maintenanceRows = buildExposeMaintenanceRows(
    timeline,
    documents,
    hideFinancials,
  );
  const maintenanceTotal = hideFinancials
    ? null
    : sumExposeMaintenanceAmounts(maintenanceRows);
  const documentedTotal = hideFinancials
    ? null
    : sumDocumentedTotals(maintenanceTotal, modificationTotal);

  const [heroImage, galleryImages, dynoResult] = await Promise.all([
    fetchHeroImage(vehicle.id, vehicleLabel, vehicle.silhouette_image_url),
    fetchGalleryImages(vehicle.id, documents, 4),
    fetchDynoChartImage(vehicle.id),
  ]);

  const metricCurrency = (value: number | null): string =>
    hideFinancials || value == null ? "" : formatCurrencyEur(value);

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
      modificationValueLabel: metricCurrency(modificationTotal),
      maintenanceValueLabel: metricCurrency(maintenanceTotal),
      documentedTotalLabel: metricCurrency(documentedTotal),
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
    latestTuevStatus: latestTuevStatusLabel(documents),
    maintenanceRows,
    modifications,
    modificationTotal,
    maintenanceTotal,
    documentedTotal,
    heroImage,
    galleryImages,
    dynoChartImage: dynoResult.image,
    dynoChartPdfNote: dynoResult.pdfNote,
  };
}
