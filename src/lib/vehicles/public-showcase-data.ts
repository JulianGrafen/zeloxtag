import {
  filterManualVehicleEntries,
} from "@/lib/documents/manual-entries";
import {
  filterShowcaseGalleryDocuments,
} from "@/lib/documents/showcase-gallery";
import { documentMediaKind } from "@/lib/documents/viewable-url";
import { resolvePublicDynoChartHref } from "@/lib/vehicles/dyno-chart-constants";
import { resolvePublicEngineSoundHref } from "@/lib/vehicles/engine-sound-constants";
import { filterPublicShowcaseDocuments, isShowcaseModificationDocument } from "@/lib/vehicles/public-showcase-documents";
import { buildShowcaseModsFingerprint } from "@/lib/showcase/build-dna-fingerprint";
import { computeBuildDnaHeuristic } from "@/lib/showcase/build-dna-heuristic";
import {
  parseShowcaseBuildDna,
  type ShowcaseBuildDna,
} from "@/lib/showcase/build-dna-schema";
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
  accel0To100Sec: number | null;
  accel100To200Sec: number | null;
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
  /** Same-origin URL for optional engine soundcheck playback. */
  engineSoundUrl: string | null;
};

export type PublicShowcasePayload = {
  profile: PublicShowcaseProfile;
  photos: PublicGalleryPhoto[];
  modifications: PublicModification[];
  buildDna: ShowcaseBuildDna | null;
};

function resolvePublicBuildDna(
  vehicle: Vehicle,
  modifications: readonly PublicModification[],
): ShowcaseBuildDna | null {
  if (modifications.length < 2) return null;
  const fingerprint = buildShowcaseModsFingerprint(modifications);
  if (vehicle.showcase_build_dna_fingerprint === fingerprint) {
    const cached = parseShowcaseBuildDna(vehicle.showcase_build_dna);
    if (cached) return cached;
  }
  return computeBuildDnaHeuristic(modifications);
}

/** True when cached DNA exists but public mods changed since the last refresh. */
export function isShowcaseBuildDnaCacheStale(
  vehicle: Vehicle,
  modifications: readonly PublicModification[],
): boolean {
  if (modifications.length < 2) return false;
  if (vehicle.showcase_build_dna_updated_at == null) return false;
  const fingerprint = buildShowcaseModsFingerprint(modifications);
  return vehicle.showcase_build_dna_fingerprint !== fingerprint;
}

/** Whether the server should recompute and persist showcase Build DNA. */
export function shouldRefreshShowcaseBuildDnaCache(
  vehicle: Vehicle,
  modifications: readonly PublicModification[],
): boolean {
  if (modifications.length < 2) return false;
  if (vehicle.showcase_build_dna_updated_at == null) return true;
  return isShowcaseBuildDnaCacheStale(vehicle, modifications);
}

/** Guest-safe fallback when cache is stale or refresh failed. */
export function withHeuristicBuildDnaFallback(
  payload: PublicShowcasePayload,
): PublicShowcasePayload {
  if (payload.buildDna != null || payload.modifications.length < 2) {
    return payload;
  }
  return {
    ...payload,
    buildDna: computeBuildDnaHeuristic(payload.modifications),
  };
}

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

function publicGalleryPhotoSrc(vehicleId: string, fileUrl: string): string | null {
  if (
    !fileUrl ||
    fileUrl.startsWith("mock://") ||
    fileUrl.startsWith("manual://")
  ) {
    return null;
  }
  if (documentMediaKind(fileUrl) !== "image") return null;
  return publicGalleryProxyUrl(vehicleId, fileUrl);
}

function collectGalleryPhotos(
  vehicle: Vehicle,
  documents: Document[],
): PublicGalleryPhoto[] {
  const photos: PublicGalleryPhoto[] = [];
  const seen = new Set<string>();
  const specs = parseVehicleTechSpecs(vehicle.tech_specs);
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`.trim() || "Fahrzeug";

  if (vehicle.silhouette_image_url?.trim()) {
    const heroSrc = `/api/vehicle/silhouette/${vehicle.id}`;
    photos.push({
      id: "silhouette",
      src: heroSrc,
      alt: vehicleLabel,
    });
    seen.add(heroSrc);
  }

  const dyno = resolvePublicDynoChartHref(vehicle.id, specs.dynoChartUrl);
  if (dyno.href && dyno.isImage && !seen.has(dyno.href)) {
    photos.push({
      id: "dyno-chart",
      src: dyno.href,
      alt: "Leistungsdiagramm",
    });
    seen.add(dyno.href);
  }

  const publicDocs = filterPublicShowcaseDocuments(documents);

  for (const entry of filterShowcaseGalleryDocuments(publicDocs)) {
    const src = publicGalleryPhotoSrc(vehicle.id, entry.file_url);
    if (!src || seen.has(src)) continue;
    seen.add(src);
    photos.push({
      id: entry.id,
      src,
      alt: entry.title || "Galerie",
    });
  }

  for (const entry of filterManualVehicleEntries(publicDocs)) {
    if (!isShowcaseModificationDocument(entry)) continue;

    const src = publicGalleryPhotoSrc(vehicle.id, entry.file_url);
    if (!src || seen.has(src)) continue;
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

function publicModCategoryLabel(
  raw: string,
  source: PublicModification["source"],
): string {
  if (source === "manual") return "Umbauten";
  if (source === "invoice") return "Teile & Umbauten";

  const trimmed = raw.trim();
  return PUBLIC_MOD_CATEGORY_LABELS[trimmed] ?? "Umbauten";
}

function mapModificationsToPublic(
  modifications: ReturnType<typeof extractVehicleModifications>,
): PublicModification[] {
  return modifications.map((mod) => {
    const source = mod.source === "manual" ? "manual" : "invoice";
    return {
      id: mod.id,
      label: mod.partName,
      category: publicModCategoryLabel(mod.category, source),
      date: mod.date,
      vendor: mod.manufacturer,
      source,
    };
  });
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

  const dyno = resolvePublicDynoChartHref(vehicle.id, specs.dynoChartUrl);

  const modifications = mapModificationsToPublic(
    extractVehicleModifications(publicDocs, {
      hideFinancials: true,
      includeOptedInInvoices: true,
      respectLineItemShowcase: true,
    }).filter((mod) => mod.source !== "abe"),
  );

  const photos = collectGalleryPhotos(vehicle, documents);
  const silhouettePhoto = photos.find((photo) => photo.id === "silhouette");

  return {
    profile: {
      vehicleId: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      powerPs: specs.powerPs,
      powerKw: specs.powerKw,
      torqueNm: specs.torqueNm,
      accel0To100Sec: specs.accel0To100Sec,
      accel100To200Sec: specs.accel100To200Sec,
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
      heroImageSrc: silhouettePhoto?.src ?? photos[0]?.src ?? null,
      hideFinancials: hide_financials,
      publicSlug: public_slug,
      engineSoundUrl: resolvePublicEngineSoundHref(
        vehicle.id,
        vehicle.sound_url,
      ),
    },
    photos,
    modifications,
    buildDna: resolvePublicBuildDna(vehicle, modifications),
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
    showcase_build_dna: vehicle.showcase_build_dna ?? null,
    showcase_build_dna_fingerprint:
      vehicle.showcase_build_dna_fingerprint ?? null,
    showcase_build_dna_updated_at:
      vehicle.showcase_build_dna_updated_at ?? null,
  };
}
