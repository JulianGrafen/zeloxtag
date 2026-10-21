import { buildPublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import type {
  PublicGalleryPhoto,
  PublicShowcasePayload,
} from "@/lib/vehicles/public-showcase-data";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import { resolvePublicDynoChartHref } from "@/lib/vehicles/dyno-chart-constants";
import {
  buildDemoBuildStorySlice,
  DEMO_BUILD_STORY_SLUG,
} from "@/lib/demo/demo-build-story";
import { DEMO_DYNO_CHART_URL } from "@/lib/demo/demo-assets";
import { DEMO_SHOWCASE_VEHICLE_IMAGE } from "@/lib/tags/demo-showcase";
import { MOCK_DEMO_VEHICLE_ID } from "@/lib/tags/mock-tags";
import type { Document, Vehicle } from "@/types/database";

function demoShowcaseVehicle(vehicle: Vehicle): Vehicle {
  const specs = parseVehicleTechSpecs(vehicle.tech_specs);
  return {
    ...vehicle,
    is_public: true,
    hide_financials: true,
    is_story_public: true,
    public_slug: DEMO_BUILD_STORY_SLUG,
    tech_specs: {
      ...specs,
      dynoChartUrl: specs.dynoChartUrl?.trim() || DEMO_DYNO_CHART_URL,
      instagramHandle: specs.instagramHandle ?? "julian.grafen",
      buildPersonalityTags: specs.buildPersonalityTags?.length
        ? specs.buildPersonalityTags
        : ["showcar", "tracktool", "oem_plus"],
    },
  };
}

/** Opt demo invoices / umbauten into the public showcase filters. */
function demoShowcaseDocuments(documents: Document[]): Document[] {
  return documents.map((doc) => ({
    ...doc,
    show_on_public_showcase: doc.type !== "tuev",
  }));
}

function isBrokenDemoPublicGallerySrc(src: string): boolean {
  return src.includes(`/api/public/vehicle/${MOCK_DEMO_VEHICLE_ID}/`);
}

/** Same-origin gallery as dashboard demo — no UUID public proxy for mock vehicle id. */
function buildDemoGalleryPhotos(
  vehicle: Vehicle,
  vehicleLabel: string,
  payloadPhotos: PublicGalleryPhoto[],
): PublicGalleryPhoto[] {
  const seen = new Set<string>();
  const merged: PublicGalleryPhoto[] = [];

  function add(photo: PublicGalleryPhoto) {
    if (seen.has(photo.src) || isBrokenDemoPublicGallerySrc(photo.src)) {
      return;
    }
    seen.add(photo.src);
    merged.push(photo);
  }

  add({
    id: "demo-catalog-hero",
    src: DEMO_SHOWCASE_VEHICLE_IMAGE,
    alt: vehicleLabel,
  });

  const specs = parseVehicleTechSpecs(vehicle.tech_specs);
  const dyno = resolvePublicDynoChartHref(vehicle.id, specs.dynoChartUrl);
  const dynoSrc =
    dyno.href && dyno.isImage ? dyno.href : DEMO_DYNO_CHART_URL;
  add({
    id: "demo-dyno",
    src: dynoSrc,
    alt: "Leistungsdiagramm",
  });

  for (const photo of payloadPhotos) {
    add(photo);
  }

  return merged;
}

export function buildDemoPublicShowcasePayload(
  vehicle: Vehicle,
  documents: Document[],
): PublicShowcasePayload {
  const enrichedVehicle = demoShowcaseVehicle(vehicle);
  const enrichedDocs = demoShowcaseDocuments(documents);
  const payload = buildPublicShowcasePayload(enrichedVehicle, enrichedDocs);
  const vehicleLabel =
    `${enrichedVehicle.make} ${enrichedVehicle.model}`.trim() || "BMW 328i";
  const photos = buildDemoGalleryPhotos(
    enrichedVehicle,
    vehicleLabel,
    payload.photos,
  );

  const buildStory = buildDemoBuildStorySlice(12, 0);
  const specs = parseVehicleTechSpecs(enrichedVehicle.tech_specs);
  const resolvedDyno = resolvePublicDynoChartHref(
    enrichedVehicle.id,
    specs.dynoChartUrl,
  );
  const dynoChartUrl =
    resolvedDyno.href?.startsWith("/demo/") === true
      ? resolvedDyno.href
      : DEMO_DYNO_CHART_URL;

  return {
    ...payload,
    photos,
    profile: {
      ...payload.profile,
      heroImageSrc: DEMO_SHOWCASE_VEHICLE_IMAGE,
      isStoryPublic: true,
      publicSlug: DEMO_BUILD_STORY_SLUG,
      dynoChartUrl,
      dynoChartIsImage: true,
    },
    buildStory,
  };
}
