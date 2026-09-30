import type { ShareableBuildData } from "./types";

export type ShareCardDensity = "comfortable" | "compact" | "dense";

export type ShareCardLayout = {
  heroHeightPercent: number;
  contentScale: number;
  density: ShareCardDensity;
  footerLogoHeightPx: number;
};

const CARD_HEIGHT_PX = 1920;
const FOOTER_BASE_PX = 168;
const DNA_BLOCK_PX = 360;
const INSTAGRAM_ROW_PX = 52;
const MODS_LINE_PX = 28;
const CONTENT_PADDING_PX = 40;

const ROW_HEIGHT_PX: Record<ShareCardDensity, number> = {
  comfortable: 72,
  compact: 64,
  dense: 56,
};

function stackedSpecExtraPx(data: ShareableBuildData): number {
  const stacked = data.specRows.find((row) => row.layout === "stacked");
  if (!stacked) return 0;
  const lines = Math.ceil(stacked.valueText.length / 42);
  return Math.min(160, 36 + lines * 22);
}

export function computeShareCardLayout(data: ShareableBuildData): ShareCardLayout {
  const specCount = data.specRows.length;
  const hasDna = data.buildDna != null;
  const hasInstagram = Boolean(data.instagramHandle);

  let heroHeightPercent = 34;
  if (specCount > 5 || hasDna) heroHeightPercent = 30;
  if (specCount > 8) heroHeightPercent = 28;

  let density: ShareCardDensity = "comfortable";
  if (specCount > 6 || hasDna) density = "compact";
  if (specCount > 9 || (specCount > 7 && hasDna)) density = "dense";

  const heroPx = (CARD_HEIGHT_PX * heroHeightPercent) / 100;
  const reserved =
    heroPx +
    FOOTER_BASE_PX +
    CONTENT_PADDING_PX +
    (hasInstagram ? INSTAGRAM_ROW_PX : 0) +
    (hasDna ? DNA_BLOCK_PX : 0) +
    (data.modificationsCount > 0 ? MODS_LINE_PX : 0) +
    stackedSpecExtraPx(data);

  const available = Math.max(200, CARD_HEIGHT_PX - reserved);
  const needed = specCount * ROW_HEIGHT_PX[density];
  let contentScale = 1;
  if (needed > available) {
    contentScale = Math.max(0.78, available / needed);
  }

  const footerLogoHeightPx =
    density === "dense" ? 112 : density === "compact" ? 132 : 152;

  return {
    heroHeightPercent,
    contentScale,
    density,
    footerLogoHeightPx,
  };
}
