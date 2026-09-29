import { buildShopifyMembershipCheckoutUrl } from "@/lib/billing/shopify-checkout";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function v4aTagCheckoutEnv(): {
  storeUrl: string;
  variantId: string;
  publicCheckoutUrl: string;
} {
  return {
    storeUrl: process.env.SHOPIFY_STORE_URL?.trim() ?? "",
    variantId: process.env.SHOPIFY_V4A_TAG_VARIANT_ID?.trim() ?? "",
    publicCheckoutUrl:
      process.env.NEXT_PUBLIC_V4A_TAG_CHECKOUT_URL?.trim() ?? "",
  };
}

export function buildV4aTagCheckoutUrl(input: {
  userId: string;
  email?: string | null;
}): string | null {
  const { publicCheckoutUrl, storeUrl, variantId } = v4aTagCheckoutEnv();
  if (publicCheckoutUrl) {
    return publicCheckoutUrl;
  }

  if (!storeUrl || !variantId || !UUID_RE.test(input.userId.trim())) {
    return null;
  }

  return buildShopifyMembershipCheckoutUrl({
    storeUrl,
    variantId,
    userId: input.userId,
    email: input.email,
  });
}
