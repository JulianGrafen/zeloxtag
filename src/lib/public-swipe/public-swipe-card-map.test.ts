import { describe, expect, it } from "vitest";

import {
  mapPublicSwipeCardList,
  mapPublicSwipeCardRow,
  mapRegisterAnonymousSwipeResult,
  publicSwipeCardToShowcaseCard,
} from "@/lib/public-swipe/public-swipe-card-map";

describe("mapPublicSwipeCardRow", () => {
  it("maps RPC card shape", () => {
    const card = mapPublicSwipeCardRow({
      id: "11111111-1111-1111-1111-111111111111",
      car_name: "Toyota GR Supra · 2021",
      hp: 387,
      total_invested_amount: 12500,
      thumbnail_path: "/api/vehicle/silhouette/111?v=1",
      top_3_mods: ["Downpipe", "Intercooler"],
      is_verified_build: true,
      upvotes_count: 84,
      downvotes_count: 16,
      clean_score_percent: 84,
    });

    expect(card?.carName).toContain("Supra");
    expect(card?.cleanScorePercent).toBe(84);
    expect(card?.top3Mods).toHaveLength(2);
  });
});

describe("publicSwipeCardToShowcaseCard", () => {
  it("maps into showcase stack card shape", () => {
    const card = mapPublicSwipeCardRow({
      id: "11111111-1111-1111-1111-111111111111",
      car_name: "Toyota GR Supra · 2021",
      hp: 387,
      thumbnail_path: "/api/vehicle/silhouette/111?v=1",
      top_3_mods: ["Downpipe"],
      is_verified_build: true,
      upvotes_count: 12,
      downvotes_count: 1,
      clean_score_percent: 92,
    });
    expect(card).not.toBeNull();
    const showcase = publicSwipeCardToShowcaseCard(card!);
    expect(showcase.publicSlug).toBe(card!.id);
    expect(showcase.make).toContain("Supra");
    expect(showcase.heroImageSrc).toBe(card!.thumbnailPath);
    expect(showcase.buildPersonalityLabels).toEqual(["Downpipe"]);
  });
});

describe("mapPublicSwipeCardList", () => {
  it("filters invalid rows", () => {
    expect(
      mapPublicSwipeCardList([
        { id: "x", car_name: "", thumbnail_path: "" },
        {
          id: "11111111-1111-1111-1111-111111111111",
          car_name: "Ok",
          thumbnail_path: "/t",
        },
      ]),
    ).toHaveLength(1);
  });
});

describe("mapRegisterAnonymousSwipeResult", () => {
  it("maps vote response", () => {
    expect(
      mapRegisterAnonymousSwipeResult({
        ok: true,
        already_voted: false,
        upvotes_count: 10,
        downvotes_count: 2,
        clean_score_percent: 83,
      }),
    ).toMatchObject({ alreadyVoted: false, cleanScorePercent: 83 });
  });
});
