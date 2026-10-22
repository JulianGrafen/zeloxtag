import { describe, expect, it } from "vitest";

import type { PublicShowcaseB2bPartner } from "@/lib/vehicles/public-showcase-data";

import {
  modMatchesPartnerBrand,
  partnerBrandHref,
} from "./partner-mod-branding";

const partner: PublicShowcaseB2bPartner = {
  kicker: "Official Build by",
  name: "Aulitzky Tuning",
  logoSrc: "/demo/logo.png",
  ctaHref: "https://example.com",
  ctaLabel: "CTA",
};

describe("modMatchesPartnerBrand", () => {
  it("matches Aulitzky vendor or label", () => {
    expect(
      modMatchesPartnerBrand(
        {
          id: "1",
          label: "Stage 2",
          category: "Umbauten",
          date: null,
          vendor: "Aulitzky Tuning",
          source: "manual",
        },
        partner,
      ),
    ).toBe(true);
    expect(
      modMatchesPartnerBrand(
        {
          id: "2",
          label: "Aulitzky Abgasanlage",
          category: "Umbauten",
          date: null,
          vendor: null,
          source: "manual",
        },
        partner,
      ),
    ).toBe(true);
    expect(partnerBrandHref(partner)).toBe("https://example.com");
  });

  it("ignores other brands", () => {
    expect(
      modMatchesPartnerBrand(
        {
          id: "3",
          label: "Eventuri Ansaugung",
          category: "Umbauten",
          date: null,
          vendor: "Eventuri",
          source: "manual",
        },
        partner,
      ),
    ).toBe(false);
  });
});
