const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildShopifyMembershipCheckoutUrl(input: {
  storeUrl: string;
  variantId: string;
  userId: string;
  email?: string | null;
}): string | null {
  const store = input.storeUrl.trim().replace(/\/$/, "");
  const variantId = input.variantId.trim();
  const userId = input.userId.trim();
  if (!store || !variantId || !UUID_RE.test(userId)) return null;

  let origin: URL;
  try {
    origin = new URL(store.includes("://") ? store : `https://${store}`);
  } catch {
    return null;
  }

  const checkout = new URL(`/cart/${encodeURIComponent(variantId)}:1`, origin);
  checkout.searchParams.set("attributes[supabase_user_id]", userId);
  checkout.searchParams.set("attributes[zeloxtag_user_id]", userId);
  const email = input.email?.trim();
  if (email && email.includes("@")) {
    checkout.searchParams.set("checkout[email]", email);
  }
  return checkout.toString();
}

export function shopifyCheckoutEnv(): {
  storeUrl: string;
  variantId: string;
} {
  return {
    storeUrl: process.env.SHOPIFY_STORE_URL?.trim() ?? "",
    variantId: process.env.SHOPIFY_MEMBERSHIP_VARIANT_ID?.trim() ?? "",
  };
}
