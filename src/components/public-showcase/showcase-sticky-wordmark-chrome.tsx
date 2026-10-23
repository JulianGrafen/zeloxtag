import type { ReactNode } from "react";

import { ZeloxBrandFadeBanner } from "@/components/brand/zelox-brand-fade-banner";
import { ZELOX_TAG_PRODUCT_URL } from "@/lib/hardware/zelox-tag-product-url";

type ShowcaseStickyWordmarkChromeProps = {
  /** Extra controls above the fade (demo nav, tabs) — solid black bar. */
  topBar?: ReactNode;
};

/**
 * Sticky Zelox wordmark with masked fade into the hero image (demo showcase chrome).
 */
export function ShowcaseStickyWordmarkChrome({
  topBar,
}: ShowcaseStickyWordmarkChromeProps) {
  return (
    <header className="sticky top-0 z-50 pointer-events-none">
      {topBar ? (
        <div className="pointer-events-auto bg-black">{topBar}</div>
      ) : null}
      <div className="zelox-brand-banner-bleed zelox-brand-banner-bleed--tight w-full">
        <ZeloxBrandFadeBanner wordmarkHref={ZELOX_TAG_PRODUCT_URL} />
      </div>
    </header>
  );
}
