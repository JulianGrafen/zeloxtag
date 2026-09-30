"use client";

import { useMemo, useRef, useState } from "react";

import { usePreparedStoryFile } from "@/hooks/use-prepared-story-file";
import {
  downloadStoryImageFile,
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

  const { storyFile, isPreparing, prepareError } = usePreparedStoryFile(
    exportRef,
    {
      filename: storyFilename,
      cacheKey,
    },
  );

  const scale = previewMaxWidth / SHAREABLE_SPEC_CARD_WIDTH_PX;
  const previewHeight = SHAREABLE_SPEC_CARD_HEIGHT_PX * scale;
  const mobileShare = isLikelyMobileShareDevice();

  const defaultShareLabel = mobileShare
    ? "In Instagram Story teilen"
    : "Story-Bild speichern";

  const defaultShareHint = mobileShare
    ? "Teilen-Menü öffnet sich — Instagram auswählen und in deine Story einfügen."
    : "PNG laden und in der Instagram-App als Story hochladen.";

  const handleExport = () => {
    if (!storyFile) {
      setActionError(
        isPreparing
          ? "Story wird vorbereitet — bitte kurz warten und erneut tippen."
          : prepareError ?? "Story-Bild ist noch nicht bereit.",
      );
      return;
    }

    setActionError(null);

    if (mobileShare) {
      setIsSharing(true);
      void shareStoryImageFile(storyFile).then((result) => {
        setIsSharing(false);
        if (result === "unavailable") {
          downloadStoryImageFile(storyFile);
          setActionError(
            "System-Teilen nicht verfügbar — Bild wurde gespeichert. In Instagram: Story → Foto aus Galerie.",
          );
        }
      });
      return;
    }

    downloadStoryImageFile(storyFile);
  };

  const isExporting = isPreparing || isSharing;
  const error = actionError ?? prepareError;

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
          error={error}
          className="w-full max-w-sm"
          label={
            isPreparing && mobileShare
              ? "Story wird vorbereitet…"
              : exportButtonLabel ?? defaultShareLabel
          }
          pendingLabel={exportButtonPendingLabel ?? "Teilen-Menü öffnet…"}
          hint={exportHint ?? defaultShareHint}
        />
      ) : null}
    </div>
  );
}
