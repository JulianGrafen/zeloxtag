import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import {
  extractVehicleModifications,
  sumVehicleModificationAmounts,
} from "@/lib/vehicles/vehicle-modifications";
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

function latestMileageKm(documents: Document[]): number | null {
  let best: number | null = null;
  for (const doc of documents) {
    const km = doc.mileage_km;
    if (km == null || !Number.isFinite(km)) continue;
    if (best == null || km > best) best = km;
  }
  return best;
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
