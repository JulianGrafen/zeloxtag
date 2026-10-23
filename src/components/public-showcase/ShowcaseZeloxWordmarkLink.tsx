import { ZELOX_TAG_PRODUCT_URL } from "@/lib/hardware/zelox-tag-product-url";

import { ZeloxBrandWordmark } from "@/components/brand/zelox-brand-wordmark";

import { showroom } from "./showroom-styles";

type ShowcaseZeloxWordmarkLinkProps = {
  /** In-hero banner uses tracked caps; sticky chrome uses wordmark component. */
  variant?: "heroBanner" | "fadeBanner";
};

const linkClassName =
  "inline-block rounded-sm text-white transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60";

/** Public showcase header — shop deep link (V4A tag product). */
export function ShowcaseZeloxWordmarkLink({
  variant = "heroBanner",
}: ShowcaseZeloxWordmarkLinkProps) {
  return (
    <a
      href={ZELOX_TAG_PRODUCT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClassName}
      aria-label="ZeloxTag im Shop — V4A-Tag konfigurieren"
    >
      {variant === "fadeBanner" ? (
        <ZeloxBrandWordmark size="banner" className="text-white" />
      ) : (
        <span className={`text-center ${showroom.brandWordmark}`}>
          <span className="sr-only">ZeloxTag</span>
          <span aria-hidden>ZELOX TAG</span>
        </span>
      )}
    </a>
  );
}
