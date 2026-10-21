export const DOCUMENT_DETAIL_TITLE_MAX_LINES = 3;
export const DOCUMENT_DETAIL_TITLE_FONT_MAX_PX = 24;
export const DOCUMENT_DETAIL_TITLE_FONT_MIN_PX = 15;
export const DOCUMENT_DETAIL_TITLE_LINE_HEIGHT = 1.18;

/** Approximate average character width for display font (px per em). */
const CHAR_WIDTH_RATIO = 0.52;

function estimateLineCount(
  text: string,
  fontSizePx: number,
  contentWidthPx: number,
): number {
  if (contentWidthPx <= 0 || fontSizePx <= 0) {
    return text.length > 0 ? 1 : 0;
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 0;
  }

  const charWidth = fontSizePx * CHAR_WIDTH_RATIO;
  const maxCharsPerLine = Math.max(1, Math.floor(contentWidthPx / charWidth));

  let lines = 1;
  let currentLineChars = 0;

  for (const word of words) {
    const wordLen = word.length;
    if (wordLen > maxCharsPerLine) {
      const wordLines = Math.ceil(wordLen / maxCharsPerLine);
      if (currentLineChars > 0) {
        lines += 1;
        currentLineChars = 0;
      }
      lines += wordLines - 1;
      currentLineChars = wordLen % maxCharsPerLine || maxCharsPerLine;
      continue;
    }

    const needed = currentLineChars === 0 ? wordLen : wordLen + 1;
    if (currentLineChars + needed > maxCharsPerLine) {
      lines += 1;
      currentLineChars = wordLen;
    } else {
      currentLineChars += needed;
    }
  }

  return lines;
}

/**
 * Heuristic font size so title fits within maxLines at contentWidthPx (SSR / first paint).
 */
export function estimateDocumentDetailTitleFontPx(
  text: string,
  contentWidthPx: number,
  maxLines: number = DOCUMENT_DETAIL_TITLE_MAX_LINES,
): number {
  const normalized = text.trim();
  if (!normalized) {
    return DOCUMENT_DETAIL_TITLE_FONT_MAX_PX;
  }

  const width = Math.max(120, contentWidthPx);

  for (
    let fontPx = DOCUMENT_DETAIL_TITLE_FONT_MAX_PX;
    fontPx >= DOCUMENT_DETAIL_TITLE_FONT_MIN_PX;
    fontPx -= 0.5
  ) {
    if (estimateLineCount(normalized, fontPx, width) <= maxLines) {
      return fontPx;
    }
  }

  return DOCUMENT_DETAIL_TITLE_FONT_MIN_PX;
}

/** Default content width for max-w-lg column minus panel padding (~512 − 80). */
export function defaultDocumentDetailTitleContentWidthPx(
  hasTrailingAside: boolean,
): number {
  const base = 432;
  return hasTrailingAside ? Math.round(base * 0.58) : base;
}

export function documentDetailTitleStyle(fontSizePx: number): {
  fontSize: string;
  lineHeight: number;
} {
  return {
    fontSize: `${fontSizePx}px`,
    lineHeight: DOCUMENT_DETAIL_TITLE_LINE_HEIGHT,
  };
}
