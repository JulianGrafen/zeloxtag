import { DEMO_BUILD_STORY_SLUG } from "@/lib/demo/demo-build-story";
import { DEMO_SHOWCASE_VEHICLE_IMAGE } from "@/lib/tags/demo-showcase";
import { MOCK_DEMO_VEHICLE_ID } from "@/lib/tags/mock-tags";
import {
  DEV_ENTDECKEN_MOCK_CARDS,
  DEV_ENTDECKEN_MOCK_DAILY_STATS,
} from "@/lib/showcase/dev-entdecken-mock";
import type { VehicleShowcaseSwipeDailyStats } from "@/lib/showcase/vehicle-showcase-swipe-daily-stats-map";
import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";

export const DEMO_ENTDECKEN_MOCK_CARDS = DEV_ENTDECKEN_MOCK_CARDS;

export const DEMO_ENTDECKEN_MOCK_WEEKLY_RANK: VehicleWeeklyShowcaseRank = {
  rank: 3,
  weeklyLikes: 14,
};

export const DEMO_ENTDECKEN_MOCK_WEEKLY_BUILDS: WeeklyTopBuild[] = [
  {
    rank: 1,
    vehicleId: "00000000-0000-4000-8000-000000000001",
    publicSlug: "dev-weekly-1",
    make: "BMW",
    model: "M2 G87",
    year: 2023,
    weeklyLikes: 24,
    heroImageSrc: "/vehicles/m3-f82.png",
    heroImageUsesCover: true,
  },
  {
    rank: 2,
    vehicleId: "00000000-0000-4000-8000-000000000002",
    publicSlug: "dev-weekly-2",
    make: "VW",
    model: "Golf 7 R",
    year: 2016,
    weeklyLikes: 18,
    heroImageSrc: "/vehicles/rx8.png",
    heroImageUsesCover: true,
  },
  {
    rank: 3,
    vehicleId: MOCK_DEMO_VEHICLE_ID,
    publicSlug: DEMO_BUILD_STORY_SLUG,
    make: "BMW",
    model: "328i",
    year: 1995,
    weeklyLikes: DEMO_ENTDECKEN_MOCK_WEEKLY_RANK.weeklyLikes,
    heroImageSrc: DEMO_SHOWCASE_VEHICLE_IMAGE,
    heroImageUsesCover: true,
  },
];

export const DEMO_ENTDECKEN_MOCK_DAILY_STATS: VehicleShowcaseSwipeDailyStats = {
  ...DEV_ENTDECKEN_MOCK_DAILY_STATS,
  vehicleId: MOCK_DEMO_VEHICLE_ID,
};
