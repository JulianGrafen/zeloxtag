import { buildV4aTagCheckoutUrl } from "@/lib/hardware/v4a-checkout-url";

/** Default Shopify product page for the physical V4A Zelox Tag. */
export const ZELOX_TAG_PRODUCT_URL =
  process.env.NEXT_PUBLIC_ZELOX_TAG_PRODUCT_URL?.trim() ||
  "https://zeloxtag.de/products/1-zelox-tag-pro";

export function resolveZeloxTagShopUrl(input: {
  userId: string;
  email?: string | null;
}): string {
  return buildV4aTagCheckoutUrl(input) ?? ZELOX_TAG_PRODUCT_URL;
}
