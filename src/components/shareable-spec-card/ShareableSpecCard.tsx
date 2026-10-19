"use client";

import { useMemo, useRef, useState } from "react";

import { usePreparedStoryFile } from "@/hooks/use-prepared-story-file";
import { useServerStoryShare } from "@/hooks/use-server-story-share";
import { isEmbeddedSocialInAppBrowser } from "@/lib/share/story-image-for-share";
import {
  embeddedBrowserShareHint,
  isLikelyMobileShareDevice,
} from "@/lib/share/share-story-image-file";
import { usePlatformServices } from "@/services/platform/context/platform-services-context";
import { cn } from "@/lib/utils";

import { slugifyShareFilename } from "./format-spec-delta";
import { ShareBuildToStoryButton } from "./ShareBuildToStoryButton";
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
  /** When set, story export uses server OG PNG (no client canvas). */
  vehicleId?: string;
  className?: string;
  previewMaxWidth?: number;
  showExportButton?: boolean;
  exportButtonLabel?: string;
  exportButtonPendingLabel?: string;
  exportHint?: string | null;
};

export function ShareableSpecCard({
  data,
  vehicleId,
  className,
  previewMaxWidth = 320,
  showExportButton = true,
  exportButtonLabel,
  exportButtonPendingLabel,
  exportHint,
}: ShareableSpecCardProps) {
  const { nativeBridge } = usePlatformServices();
  const exportRef = useRef<HTMLDivElement>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCanvasSharing, setIsCanvasSharing] = useState(false);

  const storyFilename = useMemo(
    () => `zelox-build-${slugifyShareFilename(data.modelName)}-story.png`,
    [data.modelName],
  );
  const cacheKey = useMemo(() => buildStoryCardCacheKey(data), [data]);

  const useServerOg = Boolean(vehicleId?.trim());

  const serverShare = useServerStoryShare({
    vehicleId: vehicleId ?? "",
    filename: storyFilename,
  });

  const { storyFile, nativeShareFile, isPreparing, prepareError } =
    usePreparedStoryFile(exportRef, {
      filename: storyFilename,
      cacheKey,
      enabled: !useServerOg,
    });

  const scale = previewMaxWidth / SHAREABLE_SPEC_CARD_WIDTH_PX;
  const previewHeight = SHAREABLE_SPEC_CARD_HEIGHT_PX * scale;
  const mobileShare = isLikelyMobileShareDevice();
  const inAppBrowser = mobileShare && isEmbeddedSocialInAppBrowser();

  const shareReadyFile = nativeShareFile ?? storyFile;

  const defaultShareLabel = useServerOg ? "Share Build to Story" : "Bild teilen";

  const defaultShareHint = inAppBrowser
    ? embeddedBrowserShareHint()
    : mobileShare
      ? "Teilen-Menü → Instagram — Bild landet direkt in der Story."
      : "Teilen-Menü öffnen oder Bild speichern und in Instagram als Story hochladen.";

  const handleCanvasExport = () => {
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

      setIsCanvasSharing(true);
      void nativeBridge
        .shareContent({ files: [shareReadyFile] })
        .then((result) => {
          setIsCanvasSharing(false);
          if (result === "unavailable" || result === "cancelled") {
            if (result === "unavailable") {
              setActionError(
                "Teilen fehlgeschlagen — Bild gespeichert. Instagram aus der Galerie wählen.",
              );
            }
          }
        });
      return;
    }

    void nativeBridge
      .shareContent({ files: [storyFile ?? shareReadyFile] })
      .then((result) => {
        if (result === "unavailable") {
          setActionError("Teilen nicht verfügbar — bitte Bild speichern.");
        }
      });
  };

  const handleServerExport = () => {
    setActionError(null);
    serverShare.clearError();
    void serverShare.shareToStory();
  };

  const isExporting = useServerOg
    ? serverShare.isSharing
    : isPreparing || isCanvasSharing;

  const error = useServerOg
    ? actionError ?? serverShare.error
    : actionError ?? prepareError;

  const buttonDisabled = useServerOg
    ? isExporting
    : isExporting || (mobileShare && !inAppBrowser && !shareReadyFile);

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
        useServerOg ? (
          <ShareBuildToStoryButton
            onShare={handleServerExport}
            isSharing={isExporting}
            disabled={buttonDisabled}
            error={error}
            className="w-full max-w-sm"
            label={exportButtonLabel ?? defaultShareLabel}
            pendingLabel={
              exportButtonPendingLabel ?? "Story wird erstellt…"
            }
            hint={
              inAppBrowser
                ? embeddedBrowserShareHint()
                : exportHint ?? defaultShareHint
            }
          />
        ) : (
          <ShareableSpecCardExportButton
            onExport={handleCanvasExport}
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
        )
      ) : null}
    </div>
  );
}
