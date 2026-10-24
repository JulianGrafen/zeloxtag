"use client";

import { useEffect, useState } from "react";

import { readMockUploadFileFromSession } from "@/lib/documents/mock-upload-session-cache";
import { resolveTimelineEventImageUrl } from "@/lib/documents/timeline-event-image";
import {
  documentMediaKind,
  isViewableDocumentUrl,
  resolveDocumentViewUrl,
} from "@/lib/documents/viewable-url";
import { destroyPdfDocument } from "@/lib/ocr/destroy-pdf-document";
import {
  loadPdfDocument,
  rasterizePdfPage,
} from "@/lib/ocr/pdf-source";
import type { Document } from "@/types/database";

type ThumbnailState = {
  src: string | null;
  loading: boolean;
};

async function rasterizePdfPreview(fetchSrc: string): Promise<string | null> {
  const response = await fetch(fetchSrc, { credentials: "same-origin" });
  if (!response.ok) return null;
  const blob = await response.blob();
  const pdf = await loadPdfDocument(blob);
  try {
    const raster = await rasterizePdfPage(pdf, 1);
    return URL.createObjectURL(raster.blob);
  } finally {
    await destroyPdfDocument(pdf);
  }
}

async function resolveMockDataUrlThumbnail(
  dataUrl: string,
): Promise<string | null> {
  if (dataUrl.startsWith("data:image/")) {
    return dataUrl;
  }
  if (!dataUrl.startsWith("data:application/pdf")) {
    return null;
  }
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const base64 = dataUrl.slice(comma + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "application/pdf" });
  const pdf = await loadPdfDocument(blob);
  try {
    const raster = await rasterizePdfPage(pdf, 1);
    return URL.createObjectURL(raster.blob);
  } finally {
    await destroyPdfDocument(pdf);
  }
}

export function useTimelineDocumentThumbnail(
  document: Document | undefined | null,
): ThumbnailState {
  const [state, setState] = useState<ThumbnailState>({
    src: null,
    loading: false,
  });

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const clear = () => {
      if (objectUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(objectUrl);
      }
      objectUrl = null;
    };

    async function run() {
      if (!document?.file_url) {
        setState({ src: null, loading: false });
        return;
      }

      const staticImage = resolveTimelineEventImageUrl(document);
      if (staticImage) {
        setState({ src: staticImage, loading: false });
        return;
      }

      if (document.file_url.startsWith("mock://")) {
        const mockSrc = readMockUploadFileFromSession(document.id);
        if (!mockSrc) {
          setState({ src: null, loading: false });
          return;
        }
        setState({ src: null, loading: true });
        try {
          const thumb = await resolveMockDataUrlThumbnail(mockSrc);
          if (cancelled) {
            if (thumb?.startsWith("blob:")) URL.revokeObjectURL(thumb);
            return;
          }
          objectUrl = thumb;
          setState({ src: thumb, loading: false });
        } catch {
          if (!cancelled) setState({ src: null, loading: false });
        }
        return;
      }

      if (
        !isViewableDocumentUrl(document.file_url) ||
        documentMediaKind(document.file_url) !== "pdf"
      ) {
        setState({ src: null, loading: false });
        return;
      }

      setState({ src: null, loading: true });
      try {
        const previewSrc = resolveDocumentViewUrl(document.file_url);
        const thumb = await rasterizePdfPreview(previewSrc);
        if (cancelled) {
          if (thumb) URL.revokeObjectURL(thumb);
          return;
        }
        objectUrl = thumb;
        setState({ src: thumb, loading: false });
      } catch {
        if (!cancelled) setState({ src: null, loading: false });
      }
    }

    void run();

    return () => {
      cancelled = true;
      clear();
    };
  }, [document?.file_url, document?.id]);

  return state;
}
