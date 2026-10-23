import { z } from "zod";

import {
  SHAREABLE_SPEC_CARD_HEIGHT_PX,
  SHAREABLE_SPEC_CARD_POST_HEIGHT_PX,
  SHAREABLE_SPEC_CARD_WIDTH_PX,
} from "@/components/shareable-spec-card/constants";

export const SHARE_CARD_FORMATS = ["story", "post"] as const;
export type ShareCardFormat = (typeof SHARE_CARD_FORMATS)[number];

export const SHARE_CARD_STYLES = ["rankHero", "showcase"] as const;
export type ShareCardStyle = (typeof SHARE_CARD_STYLES)[number];

export const DEFAULT_SHARE_CARD_FORMAT: ShareCardFormat = "story";
export const DEFAULT_SHARE_CARD_STYLE: ShareCardStyle = "showcase";

export function shareCardDimensions(format: ShareCardFormat): {
  width: number;
  height: number;
} {
  if (format === "post") {
    return {
      width: SHAREABLE_SPEC_CARD_WIDTH_PX,
      height: SHAREABLE_SPEC_CARD_POST_HEIGHT_PX,
    };
  }
  return {
    width: SHAREABLE_SPEC_CARD_WIDTH_PX,
    height: SHAREABLE_SPEC_CARD_HEIGHT_PX,
  };
}

export const shareCardQuerySchema = z.object({
  format: z.enum(SHARE_CARD_FORMATS).default(DEFAULT_SHARE_CARD_FORMAT),
  style: z.enum(SHARE_CARD_STYLES).default(DEFAULT_SHARE_CARD_STYLE),
});

export type ShareCardQuery = z.infer<typeof shareCardQuerySchema>;

export function parseShareCardQuery(
  searchParams: URLSearchParams,
): ShareCardQuery {
  const formatRaw = searchParams.get("format");
  const styleRaw = searchParams.get("style");
  return shareCardQuerySchema.parse({
    ...(formatRaw ? { format: formatRaw } : {}),
    ...(styleRaw ? { style: styleRaw } : {}),
  });
}

export type ShareCardVariant = {
  format: ShareCardFormat;
  style: ShareCardStyle;
};

export function shareCardVariantKey(variant: ShareCardVariant): string {
  return `${variant.format}:${variant.style}`;
}

export function isDefaultShareCardVariant(variant: ShareCardVariant): boolean {
  return (
    variant.format === DEFAULT_SHARE_CARD_FORMAT &&
    variant.style === DEFAULT_SHARE_CARD_STYLE
  );
}

/** Weekly top-3 cards default to the Build-der-Woche placement layout. */
export function resolveDefaultShareCardStyle(input: {
  weeklyShowcaseRank?: number | null;
  explicitDefault?: ShareCardStyle;
}): ShareCardStyle {
  if (input.explicitDefault) {
    return input.explicitDefault;
  }
  return input.weeklyShowcaseRank != null ? "rankHero" : DEFAULT_SHARE_CARD_STYLE;
}
