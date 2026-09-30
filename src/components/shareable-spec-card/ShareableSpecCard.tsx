"use client";

import { useRef } from "react";

import { useCardExport } from "@/hooks/use-card-export";
import { isLikelyMobileShareDevice } from "@/lib/share/share-story-image-file";
import { cn } from "@/lib/utils";

import { slugifyShareFilename } from "./format-spec-delta";
import { ShareableSpecCardExportButton } from "./ShareableSpecCardExportButton";
import { SpecCardPreview } from "./SpecCardPreview";
import {
  SHAREABLE_SPEC_CARD_EXPORT_PIXEL_RATIO,
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
  const { exportCard, isExporting, error } = useCardExport(exportRef);

  const scale = previewMaxWidth / SHAREABLE_SPEC_CARD_WIDTH_PX;
  const previewHeight = SHAREABLE_SPEC_CARD_HEIGHT_PX * scale;

  const defaultShareLabel = isLikelyMobileShareDevice()
    ? "In Instagram Story teilen"
    : "Story-Bild speichern";

  const defaultShareHint = isLikelyMobileShareDevice()
    ? "Teilen-Menü öffnet sich — Instagram auswählen und in deine Story einfügen."
    : "PNG laden und in der Instagram-App als Story hochladen.";

  const handleExport = () => {
    void exportCard({
      filenameBase: `zelox-build-${slugifyShareFilename(data.modelName)}`,
      pixelRatio: SHAREABLE_SPEC_CARD_EXPORT_PIXEL_RATIO,
    });
  };

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
          label={exportButtonLabel ?? defaultShareLabel}
          pendingLabel={exportButtonPendingLabel ?? "Story wird erstellt…"}
          hint={exportHint ?? defaultShareHint}
        />
      ) : null}
    </div>
  );
}
