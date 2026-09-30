"use client";

import { useEffect, useMemo, useState } from "react";

import type { FotodokuGallerySlide } from "@/components/documents/document-fotodoku-gallery";
import { destroyPdfDocument } from "@/lib/ocr/destroy-pdf-document";
import {
  formatPdfClientError,
  loadPdfDocument,
  rasterizePdfPage,
  yieldToMain,
} from "@/lib/ocr/pdf-source";
import type { DocumentMediaKind } from "@/lib/documents/viewable-url";

type UseFotodokuGallerySlidesOptions = {
  previewSrc: string | null;
  previewKind: DocumentMediaKind | null;
  title: string;
  pageCount: number | null | undefined;
  enabled: boolean;
};

type UseFotodokuGallerySlidesResult = {
  slides: FotodokuGallerySlide[];
  loading: boolean;
  error: string | null;
};

export function useFotodokuGallerySlides(
  options: UseFotodokuGallerySlidesOptions,
): UseFotodokuGallerySlidesResult {
  const { previewSrc, previewKind, title, pageCount, enabled } = options;

  const staticSlides = useMemo((): FotodokuGallerySlide[] => {
    if (!enabled || !previewSrc || previewKind !== "image") {
      return [];
    }
    return [{ src: previewSrc, alt: title }];
  }, [enabled, previewSrc, previewKind, title]);

  const [pdfSlides, setPdfSlides] = useState<FotodokuGallerySlide[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !previewSrc || previewKind !== "pdf") {
      setPdfSlides([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const objectUrls: string[] = [];

    const revokeAll = () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.length = 0;
    };

    const run = async () => {
      setLoading(true);
      setError(null);
      setPdfSlides([]);

      try {
        const response = await fetch(previewSrc, { credentials: "same-origin" });
        if (!response.ok) {
          throw new Error("Datei konnte nicht geladen werden.");
        }
        const blob = await response.blob();
        const pdf = await loadPdfDocument(blob);
        const totalPages = Math.max(1, pdf.numPages);
        const targetPages =
          pageCount != null && pageCount > 0
            ? Math.min(pageCount, totalPages)
            : totalPages;

        const nextSlides: FotodokuGallerySlide[] = [];
        for (let pageNumber = 1; pageNumber <= targetPages; pageNumber += 1) {
          if (cancelled) break;
          const raster = await rasterizePdfPage(pdf, pageNumber);
          const url = URL.createObjectURL(raster.blob);
          objectUrls.push(url);
          nextSlides.push({
            src: url,
            alt: `${title} — Seite ${pageNumber}`,
          });
          await yieldToMain();
        }

        await destroyPdfDocument(pdf);

        if (cancelled) {
          nextSlides.forEach((slide) => URL.revokeObjectURL(slide.src));
        } else {
          setPdfSlides(nextSlides);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(formatPdfClientError(cause));
          setPdfSlides([]);
        }
        revokeAll();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      revokeAll();
    };
  }, [enabled, pageCount, previewKind, previewSrc, title]);

  if (!enabled) {
    return { slides: [], loading: false, error: null };
  }

  if (previewKind === "image") {
    return { slides: staticSlides, loading: false, error: null };
  }

  if (previewKind === "pdf") {
    return { slides: pdfSlides, loading, error };
  }

  return { slides: [], loading: false, error: null };
}
