import {
  filterManualVehicleEntries,
  isTuningLikeCategory,
} from "@/lib/documents/manual-entries";
import { documentMediaKind } from "@/lib/documents/viewable-url";
import { publicVehicleDynoChartPath } from "@/lib/vehicles/dyno-chart-constants";
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
  category: string;
  date: string | null;
  vendor: string | null;
  source: "invoice" | "manual";
};

export type PublicModificationGroup = {
  category: string;
  items: PublicModification[];
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
  instagramHandle: string | null;
  mileageKm: number | null;
  dynoChartUrl: string | null;
  dynoChartIsImage: boolean;
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
  expose_token: string | null;
  is_expose_active: boolean;
} {
  return {
    is_public: Boolean(vehicle.is_public),
    hide_financials: vehicle.hide_financials !== false,
    public_slug:
      typeof vehicle.public_slug === "string" ? vehicle.public_slug : null,
    expose_token:
      typeof vehicle.expose_token === "string" ? vehicle.expose_token : null,
    is_expose_active: vehicle.is_expose_active === true,
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

function resolvePublicDynoChart(vehicleId: string, storedUrl: string | null): {
  href: string | null;
  isImage: boolean;
} {
  if (!storedUrl) return { href: null, isImage: false };
  if (storedUrl.startsWith("/demo/") || storedUrl.startsWith("/")) {
    return {
      href: storedUrl,
      isImage: documentMediaKind(storedUrl) === "image",
    };
  }
  return {
    href: publicVehicleDynoChartPath(vehicleId),
    isImage: documentMediaKind(storedUrl) === "image",
  };
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
    if (!isTuningLikeCategory(entry.category)) continue;
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

const PUBLIC_MOD_CATEGORY_LABELS: Record<string, string> = {
  tuning: "Teile & Umbauten",
  "Tuning / Teile": "Teile & Umbauten",
  "Manueller Eintrag": "Umbauten",
};

function publicModCategoryLabel(raw: string): string {
  const trimmed = raw.trim();
  return PUBLIC_MOD_CATEGORY_LABELS[trimmed] ?? (trimmed || "Umbauten");
}

function mapModificationsToPublic(
  modifications: ReturnType<typeof extractVehicleModifications>,
): PublicModification[] {
  return modifications.map((mod) => ({
    id: mod.id,
    label: mod.partName,
    category: publicModCategoryLabel(mod.category),
    date: mod.date,
    vendor: mod.manufacturer,
    source: mod.source === "manual" ? "manual" : "invoice",
  }));
}

export function groupPublicModifications(
  modifications: readonly PublicModification[],
): PublicModificationGroup[] {
  const order: string[] = [];
  const byCategory = new Map<string, PublicModification[]>();

  for (const mod of modifications) {
    const key = mod.category;
    if (!byCategory.has(key)) {
      byCategory.set(key, []);
      order.push(key);
    }
    byCategory.get(key)!.push(mod);
  }

  return order.map((category) => ({
    category,
    items: byCategory.get(category) ?? [],
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

  const dyno = resolvePublicDynoChart(vehicle.id, specs.dynoChartUrl);

  const modifications = mapModificationsToPublic(
    extractVehicleModifications(publicDocs, {
      hideFinancials: true,
      includeOptedInInvoices: true,
      respectLineItemShowcase: true,
    }).filter((mod) => mod.source !== "abe"),
  );

  const photos = collectGalleryPhotos(vehicle, documents);
  const heroFromGallery = photos.find((photo) => photo.id !== "silhouette");

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
      instagramHandle: specs.instagramHandle,
      mileageKm: latestMileageKm(publicDocs),
      dynoChartUrl: dyno.href,
      dynoChartIsImage: dyno.isImage,
      heroImageSrc: heroFromGallery?.src ?? `/api/vehicle/silhouette/${vehicle.id}`,
      hideFinancials: hide_financials,
      publicSlug: public_slug,
    },
    photos,
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
    expose_token: fields.expose_token,
    is_expose_active: fields.is_expose_active,
  };
}
