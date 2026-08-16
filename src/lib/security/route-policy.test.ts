import { describe, expect, it } from "vitest";

import { AUFLAGEN_KUERZEL_IMAGE_API_PATH } from "@/lib/documents/constants";

import {
  isProtectedApiPath,
  isPublicPath,
  isPublicVehicleImagePath,
} from "./route-policy";

describe("isPublicPath", () => {
  it("allows token-gated exposé URLs and keeps owner APIs protected", () => {
    expect(
      isPublicPath("/expose/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    ).toBe(true);
    expect(isPublicPath("/v/demo-active-tag")).toBe(true);
    expect(isPublicPath("/dashboard")).toBe(false);
  });
});

describe("auflagen kuerzel image GET", () => {
  it("is public media so <img> is not blocked by session or MFA", () => {
    expect(
      isPublicVehicleImagePath(AUFLAGEN_KUERZEL_IMAGE_API_PATH, "GET"),
    ).toBe(true);
    expect(isProtectedApiPath(AUFLAGEN_KUERZEL_IMAGE_API_PATH, "GET")).toBe(
      false,
    );
    expect(isProtectedApiPath(AUFLAGEN_KUERZEL_IMAGE_API_PATH, "POST")).toBe(
      true,
    );
    expect(isProtectedApiPath("/api/abe/auflagen-kuerzel", "GET")).toBe(true);
  });
});
