import type { ShareCardFormat } from "@/lib/share/share-card-variant";

/** Canvas px at 1080×1920 / 1080×1440 — matches reference mockup scale. */
export function weeklyRankStoryRankFontPx(format: ShareCardFormat): number {
  return format === "post" ? 380 : 540;
}

export function weeklyRankStoryKickerFontPx(format: ShareCardFormat): number {
  return format === "post" ? 48 : 64;
}

export const WEEKLY_RANK_STORY_RANK_OFFSET_PX = 48;
