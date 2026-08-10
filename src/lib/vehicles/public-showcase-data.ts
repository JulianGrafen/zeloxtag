import {
  filterManualVehicleEntries,
  parseManualEntryCategory,
} from "@/lib/documents/manual-entries";
import { documentMediaKind } from "@/lib/documents/viewable-url";
import { isVatLineItem } from "@/lib/ocr/invoice-vat";
import { filterPublicShowcaseDocuments } from "@/lib/vehicles/public-showcase-documents";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { Document, Vehicle } from "@/types/database";

export type PublicGalleryPhoto = {
  id: string;
  src: string;
  alt: string;
};

export type PublicModification = {
  id: string;
  label: string;
  date: string | null;
  vendor: string | null;
  amount: number | null;
  source: "invoice" | "manual";
};

export type PublicShowcaseProfile = {
  vehicleId: string;
  make: string;
  model: string;
  year: number | null;
  powerPs: number | null;
  powerKw: number | null;
  torqueNm: number | null;
  engine: string | null;
  displacementCc: number | null;
  fuelType: string | null;
  transmission: string | null;
  drivetrain: string | null;
  bodyType: string | null;
  color: string | null;
  notes: string | null;
  mileageKm: number | null;
  dynoChartUrl: string | null;
  heroImageSrc: string | null;
  hideFinancials: boolean;
  publicSlug: string | null;
};

export type PublicShowcasePayload = {
  profile: PublicShowcaseProfile;
  photos: PublicGalleryPhoto[];
  modifications: PublicModification[];
};

const LABOR_LABEL =
  /^(?:arbeitslohn|arbeitszeit|montage|demontage|kleinmaterial|entsorgung|material)$/i;

const SKIP_INVOICE_LINE =
  /^(?:summe|gesamt|netto|brutto|zwischensumme|position(?:en)?)$/i;

function normalizeVehicleShowcaseFields(vehicle: Vehicle): {
  is_public: boolean;
  hide_financials: boolean;
  public_slug: string | null;
} {
  return {
    is_public: Boolean(vehicle.is_public),
    hide_financials: vehicle.hide_financials !== false,
    public_slug:
      typeof vehicle.public_slug === "string" ? vehicle.public_slug : null,
  };
}

export function vehicleSupportsPublicShowcase(vehicle: Vehicle): boolean {
  return normalizeVehicleShowcaseFields(vehicle).is_public;
}

function latestMileageKm(documents: Document[]): number | null {
  let best: number | null = null;
  for (const doc of documents) {
    const km = doc.mileage_km;
    if (km == null || !Number.isFinite(km)) continue;
    if (best == null || km > best) best = km;
  }
  return best;
}

function publicGalleryProxyUrl(vehicleId: string, src: string): string {
  const params = new URLSearchParams({ src });
  return `/api/public/vehicle/${vehicleId}/file?${params.toString()}`;
}

function collectGalleryPhotos(
  vehicle: Vehicle,
  documents: Document[],
): PublicGalleryPhoto[] {
  const photos: PublicGalleryPhoto[] = [];
  const seen = new Set<string>();
  const publicDocs = filterPublicShowcaseDocuments(documents);

  const heroSrc = `/api/vehicle/silhouette/${vehicle.id}`;
  photos.push({
    id: "silhouette",
    src: heroSrc,
    alt: `${vehicle.make} ${vehicle.model}`.trim(),
  });
  seen.add(heroSrc);

  for (const entry of filterManualVehicleEntries(publicDocs)) {
    const category = parseManualEntryCategory(entry.category);
    if (category !== "tuning") continue;
    if (documentMediaKind(entry.file_url) !== "image") continue;
    if (!entry.file_url.startsWith("http")) continue;

    const src = publicGalleryProxyUrl(vehicle.id, entry.file_url);
    if (seen.has(src)) continue;
    seen.add(src);
    photos.push({
      id: entry.id,
      src,
      alt: entry.title,
    });
  }

  return photos;
}

function shouldIncludeInvoiceLine(label: string): boolean {
  const trimmed = label.trim();
  if (trimmed.length < 2) return false;
  if (isVatLineItem({ label: trimmed, amount: 0 })) return false;
  if (LABOR_LABEL.test(trimmed)) return false;
  if (SKIP_INVOICE_LINE.test(trimmed)) return false;
  return true;
}

function extractModificationsFromInvoices(
  documents: Document[],
  hideFinancials: boolean,
): PublicModification[] {
  const mods: PublicModification[] = [];
  const seen = new Set<string>();

  const invoices = filterPublicShowcaseDocuments(documents)
    .filter((doc) => doc.type === "invoice")
    .sort((a, b) => (b.date ?? b.created_at).localeCompare(a.date ?? a.created_at));

  for (const doc of invoices) {
    for (const item of doc.line_items ?? []) {
      if (!shouldIncludeInvoiceLine(item.label)) continue;
      const key = item.label.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      mods.push({
        id: `${doc.id}-${key.slice(0, 24)}`,
        label: item.label.trim(),
        date: doc.date,
        vendor: doc.vendor,
        amount: hideFinancials ? null : item.amount,
        source: "invoice",
      });
    }
  }

  return mods;
}

function extractModificationsFromManualEntries(
  documents: Document[],
  hideFinancials: boolean,
): PublicModification[] {
  const mods: PublicModification[] = [];
  const publicDocs = filterPublicShowcaseDocuments(documents);

  for (const entry of filterManualVehicleEntries(publicDocs)) {
    const category = parseManualEntryCategory(entry.category);
    if (category !== "tuning") continue;

    mods.push({
      id: entry.id,
      label: entry.title,
      date: entry.date ?? entry.created_at.slice(0, 10),
      vendor: entry.vendor,
      amount: hideFinancials ? null : entry.amount,
      source: "manual",
    });
  }

  return mods;
}

/** Build the public showcase payload from a full server-side vehicle twin. */
export function buildPublicShowcasePayload(
  vehicle: Vehicle,
  documents: Document[],
): PublicShowcasePayload {
  const { hide_financials, public_slug } = normalizeVehicleShowcaseFields(vehicle);
  const specs = parseVehicleTechSpecs(vehicle.tech_specs);
  const publicDocs = filterPublicShowcaseDocuments(documents);

  const dynoChartUrl = specs.dynoChartUrl
    ? publicGalleryProxyUrl(vehicle.id, specs.dynoChartUrl)
    : null;

  const invoiceMods = extractModificationsFromInvoices(documents, hide_financials);
  const manualMods = extractModificationsFromManualEntries(documents, hide_financials);

  const modifications = [...manualMods, ...invoiceMods].sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? ""),
  );

  return {
    profile: {
      vehicleId: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      powerPs: specs.powerPs,
      powerKw: specs.powerKw,
      torqueNm: specs.torqueNm,
      engine: specs.engine,
      displacementCc: specs.displacementCc,
      fuelType: specs.fuelType,
      transmission: specs.transmission,
      drivetrain: specs.drivetrain,
      bodyType: specs.bodyType,
      color: specs.color,
      notes: specs.notes?.trim() ? specs.notes.trim() : null,
      mileageKm: latestMileageKm(publicDocs),
      dynoChartUrl,
      heroImageSrc: `/api/vehicle/silhouette/${vehicle.id}`,
      hideFinancials: hide_financials,
      publicSlug: public_slug,
    },
    photos: collectGalleryPhotos(vehicle, documents),
    modifications,
  };
}

export function withDefaultShowcaseFields(vehicle: Vehicle): Vehicle {
  const fields = normalizeVehicleShowcaseFields(vehicle);
  return {
    ...vehicle,
    is_public: fields.is_public,
    hide_financials: fields.hide_financials,
    public_slug: fields.public_slug,
  };
}
