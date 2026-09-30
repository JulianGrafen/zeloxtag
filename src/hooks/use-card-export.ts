"use client";

import { useCallback, useRef, useState, type RefObject } from "react";

import { SHAREABLE_SPEC_CARD_EXPORT_PIXEL_RATIO } from "@/components/shareable-spec-card/constants";
import { slugifyShareFilename } from "@/components/shareable-spec-card/format-spec-delta";
import type { ShareableSpecCardExportOptions } from "@/components/shareable-spec-card/types";
import { captureShareCardPngFile } from "@/lib/share/capture-share-card-png-file";
import {
  downloadStoryImageFile,
  isLikelyMobileShareDevice,
  shareStoryImageFile,
} from "@/lib/share/share-story-image-file";

function exportErrorMessage(cause: unknown): string {
  if (!(cause instanceof Error)) {
    return "Export fehlgeschlagen.";
  }
  const lower = cause.message.toLowerCase();
  if (
    lower.includes("css") ||
    lower.includes("security") ||
    lower.includes("tainted") ||
    lower.includes("cors")
  ) {
    return "Export fehlgeschlagen — Fahrzeugbild blockiert (CORS). Anderes Bild verwenden.";
  }
  return cause.message || "Export fehlgeschlagen.";
}

type ShareFromPreparedFileOptions = {
  storyFile: File;
  preferShareSheet: boolean;
};

/**
 * Share or download an already rendered Story file.
 * Call synchronously from a click handler on mobile so navigator.share keeps user activation.
 */
export async function shareOrDownloadPreparedStoryFile(
  options: ShareFromPreparedFileOptions,
): Promise<{ outcome: "shared" | "aborted" | "downloaded" }> {
  const { storyFile, preferShareSheet } = options;

  if (preferShareSheet && isLikelyMobileShareDevice()) {
    const shareResult = await shareStoryImageFile(storyFile);
    if (shareResult === "shared" || shareResult === "aborted") {
      return { outcome: shareResult };
    }
  }

  downloadStoryImageFile(storyFile);
  return { outcome: "downloaded" };
}

export function useCardExport(targetRef: RefObject<HTMLElement | null>) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const exportCard = useCallback(
    async (options?: ShareableSpecCardExportOptions) => {
      const node = targetRef.current;
      if (!node || busyRef.current) {
        if (!node) {
          setError("Export-Ziel nicht bereit — bitte Seite neu laden.");
        }
        return;
      }

      busyRef.current = true;
      setIsExporting(true);
      setError(null);

      const filenameBase = options?.filenameBase ?? "zelox-build";
      const pixelRatio =
        options?.pixelRatio ?? SHAREABLE_SPEC_CARD_EXPORT_PIXEL_RATIO;
      const filename = `${slugifyShareFilename(filenameBase)}-story.png`;

      try {
        const file = await captureShareCardPngFile(node, {
          filename,
          pixelRatio,
        });

        const preferShare =
          options?.preferShareSheet ?? isLikelyMobileShareDevice();
        await shareOrDownloadPreparedStoryFile({
          storyFile: file,
          preferShareSheet: preferShare,
        });
      } catch (cause) {
        setError(exportErrorMessage(cause));
      } finally {
        busyRef.current = false;
        setIsExporting(false);
      }
    },
    [targetRef],
  );

  return { exportCard, isExporting, error, setError };
}
