import { describe, expect, it } from "vitest";

import {
  mapPublicBuildStoryRow,
  publicBuildStoryImageProxyUrl,
  resolveBuildStorySubtitle,
} from "@/lib/vehicles/build-story-map";

describe("build-story-map", () => {
  it("builds image proxy for storage paths", () => {
    const url = publicBuildStoryImageProxyUrl(
      "veh-1",
      "veh-1/doc-1-photo.jpg",
    );
    expect(url).toBe(
      "/api/public/vehicle/veh-1/file?src=veh-1%2Fdoc-1-photo.jpg",
    );
  });

  it("rejects pdf and manual urls", () => {
    expect(
      publicBuildStoryImageProxyUrl("veh-1", "veh-1/doc.pdf"),
    ).toBeNull();
    expect(
      publicBuildStoryImageProxyUrl("veh-1", "manual://x"),
    ).toBeNull();
  });

  it("maps rpc row to entry", () => {
    const entry = mapPublicBuildStoryRow("veh-1", {
      id: "doc-1",
      title: "Coilovers",
      date: "2024-06-01",
      mileage_km: 84200,
      file_url: "veh-1/doc-1.jpg",
      vendor: "Werkstatt XY",
    });
    expect(entry).toEqual({
      id: "doc-1",
      title: "Coilovers",
      date: "2024-06-01",
      mileageKm: 84200,
      imageSrc: "/api/public/vehicle/veh-1/file?src=veh-1%2Fdoc-1.jpg",
      subtitle: "Werkstatt XY",
    });
  });

  it("maps self-made vendor label", () => {
    expect(resolveBuildStorySubtitle("Selbst gemacht")).toBe("Selbst gemacht");
  });
});
