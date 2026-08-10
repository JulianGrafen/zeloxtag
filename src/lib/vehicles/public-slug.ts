import { randomBytes } from "node:crypto";

/** URL-safe share token for `/v/{public_slug}` (12 chars, ~72 bits). */
export function generatePublicSlug(): string {
  return randomBytes(9).toString("base64url");
}

export function publicShowcasePath(slug: string): string {
  return `/v/${slug.trim()}`;
}

export function isValidPublicSlug(value: string): boolean {
  return /^[a-zA-Z0-9_-]{8,32}$/.test(value.trim());
}
