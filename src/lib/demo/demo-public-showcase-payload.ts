import { buildPublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import type {
  PublicGalleryPhoto,
  PublicShowcasePayload,
} from "@/lib/vehicles/public-showcase-data";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import { resolvePublicDynoChartHref } from "@/lib/vehicles/dyno-chart-constants";
import { DEMO_SHOWCASE_VEHICLE_IMAGE } from "@/lib/tags/demo-showcase";
import { MOCK_DEMO_VEHICLE_ID } from "@/lib/tags/mock-tags";
import type { Document, Vehicle } from "@/types/database";

const DEMO_DYNO_SVG = "/demo/dyno-e36.svg";

function demoShowcaseVehicle(vehicle: Vehicle): Vehicle {
  const specs = parseVehicleTechSpecs(vehicle.tech_specs);
  return {
    ...vehicle,
    is_public: true,
    hide_financials: true,
    is_story_public: false,
    public_slug: null,
    tech_specs: {
      ...specs,
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
    dyno.href && dyno.isImage ? dyno.href : DEMO_DYNO_SVG;
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

  return {
    ...payload,
    photos,
    profile: {
      ...payload.profile,
      heroImageSrc: DEMO_SHOWCASE_VEHICLE_IMAGE,
    },
    buildStory: null,
  };
}
