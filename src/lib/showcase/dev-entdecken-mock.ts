import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";
import type { VehicleShowcaseSwipeDailyStats } from "@/lib/showcase/vehicle-showcase-swipe-daily-stats-map";
import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";

/** Dev-only fixtures for owner „Builds entdecken“ layout work. */
export const DEV_ENTDECKEN_MOCK_CARDS: ShowcaseSwipeCard[] = [
  {
    publicSlug: "dev-bmw-x3",
    make: "BMW",
    model: "X3",
    year: 2011,
    totalLikes: 8,
    heroImageSrc: "/vehicles/m3-f82.png",
    powerPs: 226,
    torqueNm: 400,
    accel0To100Sec: 8.2,
    accel100To200Sec: null,
    modificationCount: 3,
    buildDna: null,
    buildPersonalityLabels: ["Stance", "Daily", "OEM+"],
  },
  {
    publicSlug: "dev-bmw-530d",
    make: "BMW",
    model: "530d",
    year: 2011,
    totalLikes: 12,
    heroImageSrc: "/vehicles/bmw-530d.png",
    powerPs: 350,
    torqueNm: 680,
    accel0To100Sec: 5.4,
    accel100To200Sec: 14.2,
    modificationCount: 3,
    buildDna: {
      version: 2,
      archetype: "Streckenwaffe",
      punchline: "Komfort trifft Drehmoment.",
      radar: [
        { category: "Leistung", score: 72 },
        { category: "Fahrwerk", score: 48 },
        { category: "Optik", score: 55 },
        { category: "Haltbarkeit", score: 80 },
        { category: "Akustik", score: 42 },
        { category: "Straßenlage", score: 58 },
      ],
    },
    buildPersonalityLabels: ["KW V3", "Sportauspuff", "Frontlippe"],
  },
  {
    publicSlug: "dev-clk500",
    make: "Mercedes-Benz",
    model: "CLK 500",
    year: 2004,
    totalLikes: 5,
    heroImageSrc: "/vehicles/c63-w205.png",
    powerPs: 306,
    torqueNm: 460,
    accel0To100Sec: 6.1,
    accel100To200Sec: null,
    modificationCount: 0,
    buildDna: null,
    buildPersonalityLabels: [],
  },
];

export const DEV_ENTDECKEN_MOCK_WEEKLY_BUILDS: WeeklyTopBuild[] = [
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
];

export const DEV_ENTDECKEN_MOCK_DAILY_STATS: VehicleShowcaseSwipeDailyStats = {
  vehicleId: "00000000-0000-4000-8000-000000000099",
  swipeCount: 12,
  likeRatePercent: 58,
};

export const DEV_ENTDECKEN_MOCK_WEEKLY_RANK: VehicleWeeklyShowcaseRank = {
  rank: 4,
  weeklyLikes: 11,
};
