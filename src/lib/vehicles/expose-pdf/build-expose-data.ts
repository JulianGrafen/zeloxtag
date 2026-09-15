import {
  latestTuevStatusLabel,
  sanitizeExposeLabel,
  sortTimelineEventsByDateDesc,
  tuevStatusLabelFromDocument,
} from "@/lib/vehicles/expose-data";
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

/** Wartung & Servicehistorie rows for PDF (exported for tests). */
export function buildExposeMaintenanceRows(
  timeline: TimelineEvent[],
  documents: Document[],
): ExposeMaintenanceRow[] {
  const docById = new Map(documents.map((doc) => [doc.id, doc]));
  const latestTuev = latestTuevStatusLabel(documents);

  const maintenanceEvents = sortTimelineEventsByDateDesc(
    timeline.filter(isMaintenanceEvent),
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
};

/** Aggregate vehicle twin data and resolve image buffers for PDF rendering. */
export async function buildExposePdfData(
  input: BuildExposePdfDataInput,
): Promise<ExposePdfData> {
  const { vehicle, documents, timeline, sellerContact, qrCodeDataUri } = input;
  const hideFinancials = vehicle.hide_financials !== false;
  const specs = parseVehicleTechSpecs(vehicle.tech_specs);
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`.trim();

  const extractedMods = extractVehicleModifications(documents, {
    hideFinancials,
  });
  const modifications = mapModificationsToExposeRows(extractedMods);

  const modificationTotal = hideFinancials
    ? null
    : sumVehicleModificationAmounts(extractedMods);

  const [heroImage, galleryImages, dynoResult] = await Promise.all([
    fetchHeroImage(vehicle.id, vehicleLabel, vehicle.silhouette_image_url),
    fetchGalleryImages(vehicle.id, documents, 4),
    fetchDynoChartImage(vehicle.id),
  ]);

  const valueLabel = hideFinancials
    ? ""
    : modificationTotal != null
      ? formatCurrencyEur(modificationTotal)
      : "";

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
    latestTuevStatus: latestTuevStatusLabel(documents),
    maintenanceRows: buildExposeMaintenanceRows(timeline, documents),
    modifications,
    modificationTotal,
    heroImage,
    galleryImages,
    dynoChartImage: dynoResult.image,
    dynoChartPdfNote: dynoResult.pdfNote,
  };
}
