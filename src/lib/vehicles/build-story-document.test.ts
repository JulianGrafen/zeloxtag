import { describe, expect, it } from "vitest";

import {
  isBuildStoryEligibleDocument,
  isPublicBuildStoryDocument,
} from "@/lib/vehicles/build-story-document";

describe("build-story-document", () => {
  it("accepts manual tuning images", () => {
    expect(
      isBuildStoryEligibleDocument({
        invoice_number: "__manual__",
        category: "tuning",
        file_url: "veh/doc/photo.jpg",
        show_on_build_story: false,
      }),
    ).toBe(true);
  });

  it("rejects service and pdf", () => {
    expect(
      isBuildStoryEligibleDocument({
        invoice_number: "__manual__",
        category: "service",
        file_url: "veh/doc/photo.jpg",
        show_on_build_story: true,
      }),
    ).toBe(false);
    expect(
      isBuildStoryEligibleDocument({
        invoice_number: "__manual__",
        category: "tuning",
        file_url: "veh/doc/scan.pdf",
        show_on_build_story: true,
      }),
    ).toBe(false);
  });

  it("requires opt-in for public story document", () => {
    expect(
      isPublicBuildStoryDocument({
        invoice_number: "__manual__",
        category: "tuning",
        file_url: "veh/doc/photo.jpg",
        show_on_build_story: false,
      }),
    ).toBe(false);
    expect(
      isPublicBuildStoryDocument({
        invoice_number: "__manual__",
        category: "tuning",
        file_url: "veh/doc/photo.jpg",
        show_on_build_story: true,
      }),
    ).toBe(true);
  });
});
