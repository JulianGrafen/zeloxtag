import { resolvePublicAppOrigin } from "@/lib/api/resolve-api-base-url";

export function resolveAbsoluteAssetUrl(
  src: string | null | undefined,
  origin: string = resolvePublicAppOrigin(),
): string | null {
  const trimmed = src?.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${origin.replace(/\/$/, "")}${path}`;
}
