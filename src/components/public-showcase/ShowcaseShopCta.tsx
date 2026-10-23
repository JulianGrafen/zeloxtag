import { ArrowRight } from "lucide-react";

import { ZELOX_TAG_PRODUCT_URL } from "@/lib/hardware/zelox-tag-product-url";
import { cn } from "@/lib/utils";

import {
  SHOWCASE_SHOP_CTA_BODY,
  SHOWCASE_SHOP_CTA_BUTTON_LABEL,
  SHOWCASE_SHOP_CTA_HEADLINE,
} from "./showcase-shop-cta-copy";
import { showroom } from "./showroom-styles";

/** Primary hardware conversion block at the end of the public showcase. */
export function ShowcaseShopCta() {
  return (
    <section className="px-4" aria-labelledby="showcase-shop-cta-title">
      <div className={cn(showroom.panelFlat, "px-5 py-6 sm:px-6")}>
        <h2
          id="showcase-shop-cta-title"
          className="font-[family-name:var(--font-display)] text-[1.12rem] font-semibold leading-snug tracking-[-0.03em] text-white sm:text-[1.2rem]"
        >
          {SHOWCASE_SHOP_CTA_HEADLINE}
        </h2>
        <p className="mt-2.5 text-[0.88rem] leading-relaxed text-white/65">
          {SHOWCASE_SHOP_CTA_BODY}
        </p>
        <a
          href={ZELOX_TAG_PRODUCT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(showroom.cta, "mt-5")}
        >
          {SHOWCASE_SHOP_CTA_BUTTON_LABEL}
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </a>
      </div>
    </section>
  );
}
