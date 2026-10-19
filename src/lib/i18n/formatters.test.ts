import { describe, expect, it } from "vitest";

import { formatDistanceFromKm } from "@/lib/i18n/formatters";
import { regionalProfileForLocale } from "@/lib/i18n/regional-profile";

describe("formatDistanceFromKm", () => {
  it("formats km for DE", () => {
    const profile = regionalProfileForLocale("de");
    expect(formatDistanceFromKm(145000, profile)).toBe("145.000 km");
  });

  it("formats miles for EN", () => {
    const profile = regionalProfileForLocale("en", "usd");
    const formatted = formatDistanceFromKm(145000, profile);
    expect(formatted).toContain("mi");
    expect(formatted.replace(/\D/g, "")).toContain("90099");
  });
});
