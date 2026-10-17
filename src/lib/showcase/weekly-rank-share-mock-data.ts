import type { ShareableBuildData } from "@/components/shareable-spec-card/types";
import { vehicleCatalogImageUrl } from "@/lib/vehicles/vehicle-image";
import type { ShowcaseWeeklyRankAward } from "@/lib/showcase/weekly-rank-award-types";
import type { TopThreeWeeklyRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";

const MOCK_VEHICLE_ID = "11111111-1111-4111-8111-111111111111";

function mockShareCard(rank: TopThreeWeeklyRank): ShareableBuildData {
  return {
    modelName: "Volkswagen Golf 7 R · 2016",
    instagramHandle: "zeloxtag.builds",
    imageUrl: vehicleCatalogImageUrl("bmw-e36.png"),
    weeklyShowcaseRank: rank,
    modificationsCount: 14,
    buildDna: null,
    specRows: [
      {
        key: "power",
        label: "Leistung",
        valueText: "310 PS",
        layout: "quartett",
        quartett: {
          amount: 310,
          scaleMax: 450,
          scaleMin: 0,
          unit: "PS",
          polarity: "higher",
        },
      },
      {
        key: "torque",
        label: "Drehmoment",
        valueText: "400 Nm",
        layout: "quartett",
        quartett: {
          amount: 400,
          scaleMax: 600,
          scaleMin: 0,
          unit: "Nm",
          polarity: "higher",
        },
      },
      {
        key: "accel",
        label: "0–100",
        valueText: "4,6 s",
        layout: "quartett",
        quartett: {
          amount: 4.6,
          scaleMax: 12,
          scaleMin: 2.5,
          unit: "s",
          polarity: "lower",
        },
      },
    ],
  };
}

export function mockWeeklyRankShareCard(
  rank: TopThreeWeeklyRank = 1,
): ShareableBuildData {
  return mockShareCard(rank);
}

export function mockWeeklyRankAward(
  rank: TopThreeWeeklyRank = 1,
): ShowcaseWeeklyRankAward {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    vehicleId: MOCK_VEHICLE_ID,
    weekKey: "2026-W42",
    rank,
    weeklyLikes: rank === 1 ? 28 : rank === 2 ? 19 : 12,
    createdAt: "2026-10-12T18:00:00.000Z",
  };
}
