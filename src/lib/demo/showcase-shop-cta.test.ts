import { describe, expect, it } from "vitest";

import {
  SHOWCASE_SHOP_CTA_BODY,
  SHOWCASE_SHOP_CTA_BUTTON_LABEL,
  SHOWCASE_SHOP_CTA_HEADLINE,
} from "@/components/public-showcase/showcase-shop-cta-copy";
import { ZELOX_TAG_PRODUCT_URL } from "@/lib/hardware/zelox-tag-product-url";

describe("public showcase shop CTA", () => {
  it("uses the default ZeloxTag Pro product URL", () => {
    expect(ZELOX_TAG_PRODUCT_URL).toBe(
      "https://zeloxtag.de/products/1-zelox-tag-pro",
    );
  });

  it("exposes German conversion copy", () => {
    expect(SHOWCASE_SHOP_CTA_HEADLINE).toMatch(/Papierordner/);
    expect(SHOWCASE_SHOP_CTA_BODY).toMatch(/V4A-Edelstahl/);
    expect(SHOWCASE_SHOP_CTA_BUTTON_LABEL).toMatch(/konfigurieren/);
  });
});
