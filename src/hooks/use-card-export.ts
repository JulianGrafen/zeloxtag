"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import { toPng } from "html-to-image";

import {
  SHAREABLE_SPEC_CARD_EXPORT_PIXEL_RATIO,
  SHAREABLE_SPEC_CARD_HEIGHT_PX,
  SHAREABLE_SPEC_CARD_WIDTH_PX,
} from "@/components/shareable-spec-card/constants";
import { slugifyShareFilename } from "@/components/shareable-spec-card/format-spec-delta";
import type { ShareableSpecCardExportOptions } from "@/components/shareable-spec-card/types";
import { shareStoryImageFile } from "@/lib/share/share-story-image-file";

async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );
}

async function waitForFonts(): Promise<void> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(header)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

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

      const mount = document.createElement("div");
      mount.setAttribute("aria-hidden", "true");
      mount.style.position = "fixed";
      mount.style.left = "0";
      mount.style.top = "0";
      mount.style.zIndex = "-1";
      mount.style.pointerEvents = "none";

      const clone = node.cloneNode(true) as HTMLElement;
      mount.appendChild(clone);
      document.body.appendChild(mount);

      try {
        await waitForFonts();
        await waitForImages(clone);

        const dataUrl = await toPng(clone, {
          width: SHAREABLE_SPEC_CARD_WIDTH_PX,
          height: SHAREABLE_SPEC_CARD_HEIGHT_PX,
          pixelRatio,
          cacheBust: true,
          skipFonts: false,
        });

        const blob = dataUrlToBlob(dataUrl);
        const file = new File([blob], filename, { type: "image/png" });

        const shareResult = await shareStoryImageFile(file);
        if (shareResult === "shared" || shareResult === "aborted") {
          return;
        }

        downloadBlob(blob, filename);
      } catch (cause) {
        setError(exportErrorMessage(cause));
      } finally {
        mount.remove();
        busyRef.current = false;
        setIsExporting(false);
      }
    },
    [targetRef],
  );

  return { exportCard, isExporting, error };
}
