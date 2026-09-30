"use client";

import { useMemo, useRef, useState } from "react";

import { usePreparedStoryFile } from "@/hooks/use-prepared-story-file";
import { isEmbeddedSocialInAppBrowser } from "@/lib/share/story-image-for-share";
import {
  canOpenNativeStoryShareSheet,
  downloadStoryImageFile,
  embeddedBrowserShareHint,
  isLikelyMobileShareDevice,
  shareStoryImageFile,
} from "@/lib/share/share-story-image-file";
import { cn } from "@/lib/utils";

import { slugifyShareFilename } from "./format-spec-delta";
import { ShareableSpecCardExportButton } from "./ShareableSpecCardExportButton";
import { SpecCardPreview } from "./SpecCardPreview";
import { buildStoryCardCacheKey } from "./story-cache-key";
import {
  SHAREABLE_SPEC_CARD_HEIGHT_PX,
  SHAREABLE_SPEC_CARD_WIDTH_PX,
} from "./constants";
import type { ShareableBuildData } from "./types";

type ShareableSpecCardProps = {
  data: ShareableBuildData;
  className?: string;
  previewMaxWidth?: number;
  showExportButton?: boolean;
  exportButtonLabel?: string;
  exportButtonPendingLabel?: string;
  exportHint?: string | null;
};

export function ShareableSpecCard({
  data,
  className,
  previewMaxWidth = 320,
  showExportButton = true,
  exportButtonLabel,
  exportButtonPendingLabel,
  exportHint,
}: ShareableSpecCardProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const storyFilename = useMemo(
    () => `zelox-build-${slugifyShareFilename(data.modelName)}-story.png`,
    [data.modelName],
  );
  const cacheKey = useMemo(() => buildStoryCardCacheKey(data), [data]);

  const { storyFile, nativeShareFile, isPreparing, prepareError } =
    usePreparedStoryFile(exportRef, {
      filename: storyFilename,
      cacheKey,
    });

  const scale = previewMaxWidth / SHAREABLE_SPEC_CARD_WIDTH_PX;
  const previewHeight = SHAREABLE_SPEC_CARD_HEIGHT_PX * scale;
  const mobileShare = isLikelyMobileShareDevice();
  const inAppBrowser = mobileShare && isEmbeddedSocialInAppBrowser();

  const shareReadyFile = nativeShareFile ?? storyFile;

  const defaultShareLabel = "Bild teilen";

  const defaultShareHint = inAppBrowser
    ? embeddedBrowserShareHint()
    : mobileShare
      ? "Teilen-Menü → Instagram — Bild landet direkt in der Story."
      : "Teilen-Menü öffnen oder Bild speichern und in Instagram als Story hochladen.";

  const handleExport = () => {
    if (!shareReadyFile) {
      setActionError(
        isPreparing
          ? "Story wird vorbereitet — bitte kurz warten und erneut tippen."
          : prepareError ?? "Story-Bild ist noch nicht bereit.",
      );
      return;
    }

    setActionError(null);

    if (mobileShare) {
      if (inAppBrowser) {
        setActionError(embeddedBrowserShareHint());
        return;
      }

      if (!canOpenNativeStoryShareSheet(shareReadyFile)) {
        downloadStoryImageFile(storyFile ?? shareReadyFile);
        setActionError(
          "Teilen hier nicht möglich — Bild gespeichert. In Instagram: Story → Galerie.",
        );
        return;
      }

      // Invoke Web Share immediately in the tap handler (no setState before share).
      const sharePromise = shareStoryImageFile(shareReadyFile);
      void sharePromise.then((result) => {
        setIsSharing(false);
        if (result === "unavailable") {
          downloadStoryImageFile(storyFile ?? shareReadyFile);
          setActionError(
            "Teilen fehlgeschlagen — Bild gespeichert. Instagram aus der Galerie wählen.",
          );
        }
      });
      setIsSharing(true);
      return;
    }

    downloadStoryImageFile(storyFile ?? shareReadyFile);
  };

  const isExporting = isPreparing || isSharing;
  const error = actionError ?? prepareError;

  const buttonDisabled =
    isExporting || (mobileShare && !inAppBrowser && !shareReadyFile);

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div
        className="relative overflow-hidden rounded-2xl ring-1 ring-white/10"
        style={{ width: previewMaxWidth, height: previewHeight }}
      >
        <div
          className="origin-top-left"
          style={{
            transform: `scale(${scale})`,
            width: SHAREABLE_SPEC_CARD_WIDTH_PX,
            height: SHAREABLE_SPEC_CARD_HEIGHT_PX,
          }}
        >
          <SpecCardPreview ref={exportRef} data={data} />
        </div>
      </div>

      {showExportButton ? (
        <ShareableSpecCardExportButton
          onExport={handleExport}
          isExporting={isExporting}
          disabled={buttonDisabled}
          error={error}
          className="w-full max-w-sm"
          label={
            isPreparing && mobileShare
              ? "Story wird vorbereitet…"
              : exportButtonLabel ?? defaultShareLabel
          }
          pendingLabel={exportButtonPendingLabel ?? "Teilen-Menü öffnet…"}
          hint={
            inAppBrowser
              ? embeddedBrowserShareHint()
              : exportHint ?? defaultShareHint
          }
        />
      ) : null}
    </div>
  );
}
