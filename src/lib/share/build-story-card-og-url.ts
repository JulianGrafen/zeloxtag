import { resolveApiUrl } from "@/lib/api/resolve-api-base-url";
import {
  DEFAULT_SHARE_CARD_FORMAT,
  DEFAULT_SHARE_CARD_STYLE,
  type ShareCardFormat,
  type ShareCardStyle,
} from "@/lib/share/share-card-variant";

export type StoryCardOgUrlOptions = {
  format?: ShareCardFormat;
  style?: ShareCardStyle;
};

export function buildStoryCardOgApiPath(
  vehicleId: string,
  options?: StoryCardOgUrlOptions,
): string {
  const params = new URLSearchParams({ vehicleId });
  const format = options?.format ?? DEFAULT_SHARE_CARD_FORMAT;
  const style = options?.style ?? DEFAULT_SHARE_CARD_STYLE;
  if (format !== DEFAULT_SHARE_CARD_FORMAT) {
    params.set("format", format);
  }
  if (style !== DEFAULT_SHARE_CARD_STYLE) {
    params.set("style", style);
  }
  return `/api/og/story-card?${params.toString()}`;
}

export function buildStoryCardOgUrl(
  vehicleId: string,
  options?: StoryCardOgUrlOptions,
): string {
  return resolveApiUrl(buildStoryCardOgApiPath(vehicleId, options));
}
