import { resolveApiUrl } from "@/lib/api/resolve-api-base-url";

export function buildStoryCardOgApiPath(vehicleId: string): string {
  const params = new URLSearchParams({ vehicleId });
  return `/api/og/story-card?${params.toString()}`;
}

export function buildStoryCardOgUrl(vehicleId: string): string {
  return resolveApiUrl(buildStoryCardOgApiPath(vehicleId));
}
