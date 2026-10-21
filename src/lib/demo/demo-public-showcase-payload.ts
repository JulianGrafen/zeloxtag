import { buildPublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import { DEMO_SHOWCASE_VEHICLE_IMAGE } from "@/lib/tags/demo-showcase";
import type { Document, Vehicle } from "@/types/database";

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

export function buildDemoPublicShowcasePayload(
  vehicle: Vehicle,
  documents: Document[],
): PublicShowcasePayload {
  const enrichedVehicle = demoShowcaseVehicle(vehicle);
  const enrichedDocs = demoShowcaseDocuments(documents);
  const payload = buildPublicShowcasePayload(enrichedVehicle, enrichedDocs);

  return {
    ...payload,
    profile: {
      ...payload.profile,
      heroImageSrc:
        payload.profile.heroImageSrc ?? DEMO_SHOWCASE_VEHICLE_IMAGE,
    },
    buildStory: null,
  };
}
