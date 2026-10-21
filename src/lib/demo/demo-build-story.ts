import { DEMO_DYNO_CHART_URL } from "@/lib/demo/demo-assets";
import { DEMO_SHOWCASE_VEHICLE_IMAGE } from "@/lib/tags/demo-showcase";
import type { BuildStoryEntry } from "@/lib/vehicles/build-story-map";
import type { PublicBuildStorySlice } from "@/lib/vehicles/public-showcase-data";

/** Public slug for demo Build Story (no Supabase RPC). */
export const DEMO_BUILD_STORY_SLUG = "bmw-e36-demo";

const DEMO_BUILD_STORY_ENTRIES: BuildStoryEntry[] = [
  {
    id: "demo_story_widebody",
    title: "Widebody montiert",
    date: "2019-04-12",
    mileageKm: 108_200,
    imageSrc: DEMO_SHOWCASE_VEHICLE_IMAGE,
    subtitle: "Rocket Bunny V1",
  },
  {
    id: "demo_story_kw",
    title: "KW V1 eingebaut",
    date: "2019-09-03",
    mileageKm: 112_400,
    imageSrc: DEMO_SHOWCASE_VEHICLE_IMAGE,
    subtitle: "TÜV-sicher · Tiefergelegt",
  },
  {
    id: "demo_story_gt_wing",
    title: "GT-Flügel & Diffusor",
    date: "2020-02-28",
    mileageKm: 115_800,
    imageSrc: DEMO_SHOWCASE_VEHICLE_IMAGE,
    subtitle: "Carbon · Track-Setup",
  },
  {
    id: "demo_story_bbs",
    title: "BBS LM aufgezogen",
    date: "2021-05-14",
    mileageKm: 128_900,
    imageSrc: DEMO_SHOWCASE_VEHICLE_IMAGE,
    subtitle: "18″ · frisch poliert",
  },
  {
    id: "demo_story_dyno",
    title: "Dyno-Stand · Abstimmung",
    date: "2022-11-06",
    mileageKm: 141_200,
    imageSrc: DEMO_DYNO_CHART_URL,
    subtitle: "Leistungsdiagramm",
  },
  {
    id: "demo_story_trackday",
    title: "Trackday Hockenheim",
    date: "2023-06-18",
    mileageKm: 147_600,
    imageSrc: DEMO_SHOWCASE_VEHICLE_IMAGE,
    subtitle: "Setup-Check Fahrwerk",
  },
];

export function buildDemoBuildStorySlice(
  limit = 12,
  offset = 0,
): PublicBuildStorySlice {
  const safeOffset = Math.max(0, Math.floor(offset));
  const safeLimit = Math.min(24, Math.max(1, Math.floor(limit)));
  const slice = DEMO_BUILD_STORY_ENTRIES.slice(
    safeOffset,
    safeOffset + safeLimit,
  );
  return {
    entries: slice,
    hasMore: safeOffset + slice.length < DEMO_BUILD_STORY_ENTRIES.length,
  };
}
