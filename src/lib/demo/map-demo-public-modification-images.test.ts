import { describe, expect, it } from "vitest";

import { mapDemoPublicModificationImages } from "./map-demo-public-modification-images";

describe("mapDemoPublicModificationImages", () => {
  it("uses static /demo paths instead of API proxy URLs", () => {
    const documents = [
      {
        id: "doc_1",
        file_url: "/demo/autohaus-kemper-black-betty-front.jpg",
      },
    ];

    const mapped = mapDemoPublicModificationImages(
      [
        {
          id: "doc_1",
          label: "Carbon Breitbau",
          category: "Umbauten",
          date: null,
          vendor: null,
          source: "manual",
          imageSrc: "/api/public/vehicle/x/file?src=broken",
          amount: null,
        },
      ],
      documents,
    );

    expect(mapped[0]?.imageSrc).toBe(
      "/demo/autohaus-kemper-black-betty-front.jpg",
    );
  });
});
