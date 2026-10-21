"use client";

import {
  createElement,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { automotiveDisplayTitleClassName } from "@/components/ui/automotive";
import {
  DOCUMENT_DETAIL_TITLE_FONT_MAX_PX,
  DOCUMENT_DETAIL_TITLE_FONT_MIN_PX,
  DOCUMENT_DETAIL_TITLE_MAX_LINES,
  defaultDocumentDetailTitleContentWidthPx,
  documentDetailTitleStyle,
  estimateDocumentDetailTitleFontPx,
} from "@/lib/typography/document-detail-title-layout";
import { cn } from "@/lib/utils";

type AdaptiveDocumentDetailTitleProps = {
  children: string;
  className?: string;
  as?: "h1" | "p";
  /** Narrower title column when amount/chips sit on the right. */
  hasTrailingAside?: boolean;
};

function measureFits(
  element: HTMLElement,
  maxLines: number,
  fontPx: number,
): boolean {
  const style = documentDetailTitleStyle(fontPx);
  element.style.fontSize = style.fontSize;
  element.style.lineHeight = String(style.lineHeight);
  const lineHeightPx = fontPx * style.lineHeight;
  const maxHeight = lineHeightPx * maxLines + 1;
  return element.scrollHeight <= maxHeight;
}

export function AdaptiveDocumentDetailTitle({
  children,
  className,
  as: Tag = "h1",
  hasTrailingAside = false,
}: AdaptiveDocumentDetailTitleProps) {
  const text = children.trim() || "Dokument";
  const ref = useRef<HTMLHeadingElement | HTMLParagraphElement>(null);
  const [fontPx, setFontPx] = useState(() =>
    estimateDocumentDetailTitleFontPx(
      text,
      defaultDocumentDetailTitleContentWidthPx(hasTrailingAside),
    ),
  );
  const [clamped, setClamped] = useState(false);

  const fitToWidth = useCallback(
    (width: number) => {
      const el = ref.current;
      if (!el) return;

      const startPx = estimateDocumentDetailTitleFontPx(text, width);
      let chosen = startPx;

      for (let px = startPx; px >= DOCUMENT_DETAIL_TITLE_FONT_MIN_PX; px -= 0.5) {
        if (measureFits(el, DOCUMENT_DETAIL_TITLE_MAX_LINES, px)) {
          chosen = px;
          break;
        }
        chosen = px;
      }

      const fitsAtMin = measureFits(
        el,
        DOCUMENT_DETAIL_TITLE_MAX_LINES,
        chosen,
      );
      setFontPx(chosen);
      setClamped(!fitsAtMin && chosen <= DOCUMENT_DETAIL_TITLE_FONT_MIN_PX);
    },
    [text],
  );

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    fitToWidth(el.clientWidth || defaultDocumentDetailTitleContentWidthPx(hasTrailingAside));

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      fitToWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitToWidth, hasTrailingAside, text]);

  const style: CSSProperties = documentDetailTitleStyle(fontPx);

  return createElement(
    Tag,
    {
      ref,
      className: cn(
        automotiveDisplayTitleClassName,
        "min-w-0 text-balance [overflow-wrap:anywhere]",
        clamped && "line-clamp-3",
        className,
      ),
      style,
      title: clamped ? text : undefined,
    },
    text,
  );
}
