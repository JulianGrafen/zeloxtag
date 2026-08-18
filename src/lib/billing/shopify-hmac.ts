import { createHmac, timingSafeEqual } from "crypto";

export function verifyShopifyHmac(
  rawBody: string,
  headerValue: string | null,
  secret: string,
): boolean {
  const provided = headerValue?.trim() ?? "";
  const key = secret.trim();
  if (!provided || !key) return false;

  const expected = createHmac("sha256", key).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function shopMatchesAllowlist(
  shopDomain: string | null,
  allowedShop: string | null,
): boolean {
  const incoming = shopDomain?.trim().toLowerCase() ?? "";
  const allowed = allowedShop?.trim().toLowerCase() ?? "";
  if (!allowed) return true;
  if (!incoming) return false;
  return incoming === allowed || incoming === `${allowed}.myshopify.com`;
}
