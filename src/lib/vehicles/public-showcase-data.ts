import {
  filterManualVehicleEntries,
  parseManualEntryCategory,
} from "@/lib/documents/manual-entries";
import { documentMediaKind } from "@/lib/documents/viewable-url";
import { filterPublicShowcaseDocuments } from "@/lib/vehicles/public-showcase-documents";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import { extractVehicleModifications } from "@/lib/vehicles/vehicle-modifications";
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

function mapModificationsToPublic(
  modifications: ReturnType<typeof extractVehicleModifications>,
): PublicModification[] {
  return modifications.map((mod) => ({
    id: mod.id,
    label: mod.partName,
    date: mod.date,
    vendor: mod.manufacturer,
    amount: mod.amount,
    source: mod.source === "manual" ? "manual" : "invoice",
  }));
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

  const modifications = mapModificationsToPublic(
    extractVehicleModifications(documents, {
      hideFinancials: hide_financials,
      documentFilter: (doc) =>
        filterPublicShowcaseDocuments([doc]).length > 0,
    }).filter((mod) => mod.source !== "abe"),
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
