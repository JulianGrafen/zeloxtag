import { describe, expect, it } from "vitest";

import {
  LANDING_LOGIN_HREF,
  LANDING_SHOP_HREF,
  landingArchitecture,
  landingCommunity,
  landingCta,
  landingDemoVault,
  landingFaq,
  landingHardware,
  landingHero,
  landingHowItWorks,
  landingNav,
  landingProblem,
  landingHeroShowcase,
} from "./landingContent";

describe("landingContent", () => {
  it("keeps shop and login as keynote CTAs, not an in-page checkout", () => {
    expect(LANDING_SHOP_HREF.startsWith("https://")).toBe(true);
    expect(LANDING_LOGIN_HREF).toBe("/login");
    expect(landingNav.shopCta).toMatch(/Tag sichern/);
    expect(landingCta.button).toMatch(/ZeloxTag sichern/);
  });

  it("covers the storytelling anchors from the brief", () => {
    expect(landingNav.links.map((link) => link.href)).toEqual([
      "#problem",
      "#hardware",
      "#system",
      "#live-preview",
      "#faq",
    ]);
    expect(landingHero.primaryHref).toBe("#live-preview");
    expect(landingHero.secondaryHref).toBe("#hardware");
    expect(landingProblem.cards).toHaveLength(3);
    expect(landingHardware.tiles).toHaveLength(4);
    expect(landingHardware.tiles[0]?.size).toBe("large");
    expect(landingHowItWorks.steps).toHaveLength(3);
    expect(landingCommunity.quotes.length).toBeGreaterThanOrEqual(3);
    expect(landingFaq.items).toHaveLength(5);
  });

  it("keeps privacy split and documented investment in the live demo", () => {
    expect(landingArchitecture.publicStatus).toMatch(/kein App-Zwang/);
    expect(landingArchitecture.vaultStatus).toMatch(/Einmallink/);
    expect(landingDemoVault.investmentValue).toBe("24.580,00 €");
    expect(landingFaq.items.some((item) => item.answer.includes("45 × 50 × 0,6 mm"))).toBe(
      true,
    );
  });

  it("uses the product photo for hero tag showcase", () => {
    expect(landingHeroShowcase.tagImageSrc).toBe("/brand/zelox-tag-hero-cutout.png");
    expect(landingHeroShowcase.tagImageAlt.length).toBeGreaterThan(10);
  });
});
