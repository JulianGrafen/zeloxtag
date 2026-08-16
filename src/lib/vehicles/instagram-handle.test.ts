import { describe, expect, it } from "vitest";

import {
  instagramHandleLabel,
  instagramProfileUrl,
  parseInstagramHandle,
} from "@/lib/vehicles/instagram-handle";

describe("parseInstagramHandle", () => {
  it("accepts @handles and profile URLs", () => {
    expect(parseInstagramHandle("@julian_f11")).toBe("julian_f11");
    expect(parseInstagramHandle("https://instagram.com/julian_f11")).toBe(
      "julian_f11",
    );
  });

  it("rejects javascript and path injection", () => {
    expect(parseInstagramHandle("javascript:alert(1)")).toBeNull();
    expect(parseInstagramHandle("evil.com/julian")).toBeNull();
    expect(parseInstagramHandle("")).toBeNull();
  });
});

describe("instagramProfileUrl", () => {
  it("builds a same-host Instagram URL", () => {
    expect(instagramProfileUrl("julian_f11")).toBe(
      "https://www.instagram.com/julian_f11/",
    );
    expect(instagramHandleLabel("julian_f11")).toBe("@julian_f11");
  });
});
