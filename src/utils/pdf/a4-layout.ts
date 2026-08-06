/** DIN A4 page size in millimeters (portrait). */
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export type A4ContainLayout = {
  /** Draw width on the page (mm). */
  widthMm: number;
  /** Draw height on the page (mm). */
  heightMm: number;
  /** Left offset for horizontal centering (mm). */
  xMm: number;
  /** Top offset for vertical centering (mm). */
  yMm: number;
};

/**
 * Compute object-fit: contain placement for an image on a fixed A4 page.
 * Uses pixel dimensions only for aspect ratio; output is in millimeters.
 */
export function computeA4ContainLayout(
  imageWidthPx: number,
  imageHeightPx: number,
  pageWidthMm: number = A4_WIDTH_MM,
  pageHeightMm: number = A4_HEIGHT_MM,
): A4ContainLayout {
  const safeWidthPx = Math.max(1, imageWidthPx);
  const safeHeightPx = Math.max(1, imageHeightPx);
  const aspect = safeWidthPx / safeHeightPx;

  let widthMm = pageWidthMm;
  let heightMm = widthMm / aspect;

  if (heightMm > pageHeightMm) {
    heightMm = pageHeightMm;
    widthMm = heightMm * aspect;
  }

  return {
    widthMm,
    heightMm,
    xMm: (pageWidthMm - widthMm) / 2,
    yMm: (pageHeightMm - heightMm) / 2,
  };
}

/**
 * Scale image pixel dimensions down to fit within a square max side length.
 */
export function computeScaledDimensions(
  sourceWidthPx: number,
  sourceHeightPx: number,
  maxDimensionPx: number,
): { widthPx: number; heightPx: number; scale: number } {
  const safeWidth = Math.max(1, sourceWidthPx);
  const safeHeight = Math.max(1, sourceHeightPx);
  const scale = Math.min(1, maxDimensionPx / safeWidth, maxDimensionPx / safeHeight);

  return {
    widthPx: Math.max(1, Math.round(safeWidth * scale)),
    heightPx: Math.max(1, Math.round(safeHeight * scale)),
    scale,
  };
}
