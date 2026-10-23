"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { usePreparedStoryFile } from "@/hooks/use-prepared-story-file";
import { useServerStoryShare } from "@/hooks/use-server-story-share";
import { captureShareCardPngFile } from "@/lib/share/capture-share-card-png-file";
import { isShareCardPreviewHeroReady } from "@/lib/share/share-card-preview-hero-ready";
import { createStoryJpegForNativeShare } from "@/lib/share/story-image-for-share";
import { useIosHaptics } from "@/components/ui/ios/use-ios-haptics";
import { isEmbeddedSocialInAppBrowser } from "@/lib/share/story-image-for-share";
import {
  embeddedBrowserShareHint,
  isLikelyMobileShareDevice,
} from "@/lib/share/share-story-image-file";
import {
  resolveDefaultShareCardStyle,
  shareCardDimensions,
  type ShareCardFormat,
  type ShareCardStyle,
} from "@/lib/share/share-card-variant";
import {
  resolveInitialShareCardVariant,
  writeShareCardVariantToSession,
} from "@/lib/share/share-card-variant-storage";
import { usePlatformServices } from "@/services/platform/context/platform-services-context";
import { cn } from "@/lib/utils";

import { slugifyShareFilename } from "./format-spec-delta";
import { ShareBuildToStoryButton } from "./ShareBuildToStoryButton";
import { ShareableSpecCardExportButton } from "./ShareableSpecCardExportButton";
import { SpecCardPreview } from "./SpecCardPreview";
import { buildStoryCardCacheKey } from "./story-cache-key";
import type { ShareableBuildData } from "./types";

const SWIPE_THRESHOLD_PX = 48;

type ShareCardComposerProps = {
  data: ShareableBuildData;
  vehicleId?: string;
  className?: string;
  previewMaxWidth?: number;
  showExportButton?: boolean;
  defaultFormat?: ShareCardFormat;
  defaultStyle?: ShareCardStyle;
  exportButtonLabel?: string;
  exportButtonPendingLabel?: string;
  exportHint?: string | null;
  persistVariant?: boolean;
};

function exportLabelForFormat(format: ShareCardFormat): string {
  return format === "post" ? "Für Feed teilen" : "In Story teilen";
}

export function ShareCardComposer({
  data,
  vehicleId,
  className,
  previewMaxWidth = 320,
  showExportButton = true,
  defaultFormat = "story",
  defaultStyle,
  exportButtonLabel,
  exportButtonPendingLabel,
  exportHint,
  persistVariant = true,
}: ShareCardComposerProps) {
  const { nativeBridge } = usePlatformServices();
  const haptics = useIosHaptics();
  const exportRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const preferRankHeroStyle = data.weeklyShowcaseRank != null;
  const resolvedDefaultStyle = resolveDefaultShareCardStyle({
    weeklyShowcaseRank: data.weeklyShowcaseRank,
    explicitDefault: defaultStyle,
  });

  const [variant, setVariant] = useState(() =>
    resolveInitialShareCardVariant(
      vehicleId,
      {
        format: defaultFormat,
        style: resolvedDefaultStyle,
      },
      { preferRankHeroStyle },
    ),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCanvasSharing, setIsCanvasSharing] = useState(false);

  const { format, style } = variant;
  const dims = shareCardDimensions(format);
  const scale = previewMaxWidth / dims.width;
  const previewHeight = dims.height * scale;

  const storyFilename = useMemo(
    () =>
      `zelox-build-${slugifyShareFilename(data.modelName)}-${format}-${style}.png`,
    [data.modelName, format, style],
  );

  const cacheKey = useMemo(
    () => buildStoryCardCacheKey(data, variant),
    [data, variant],
  );

  const useServerOg = Boolean(vehicleId?.trim());

  const serverShare = useServerStoryShare({
    vehicleId: vehicleId ?? "",
    filename: storyFilename,
    format,
    style,
  });

  const { storyFile, nativeShareFile, isPreparing, prepareError } =
    usePreparedStoryFile(exportRef, {
      filename: storyFilename,
      cacheKey,
      enabled: true,
    });

  const mobileShare = isLikelyMobileShareDevice();
  const inAppBrowser = mobileShare && isEmbeddedSocialInAppBrowser();
  const shareReadyFile = nativeShareFile ?? storyFile;
  const expectsHeroImage = Boolean(data.imageUrl?.trim());
  const [previewHeroReady, setPreviewHeroReady] = useState(false);

  useEffect(() => {
    const node = exportRef.current;
    if (!node || !expectsHeroImage) {
      setPreviewHeroReady(false);
      return;
    }

    const sync = () => {
      setPreviewHeroReady(isShareCardPreviewHeroReady(node));
    };

    sync();
    const hero = node.querySelector<HTMLImageElement>("img[data-share-card-hero]");
    hero?.addEventListener("load", sync);
    hero?.addEventListener("error", sync);

    const observer = new MutationObserver(sync);
    observer.observe(node, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });

    return () => {
      hero?.removeEventListener("load", sync);
      hero?.removeEventListener("error", sync);
      observer.disconnect();
    };
  }, [expectsHeroImage, data.imageUrl, format, style, cacheKey]);

  const preferCanvasShare =
    expectsHeroImage && (Boolean(shareReadyFile) || previewHeroReady);

  const defaultShareHint = inAppBrowser
    ? embeddedBrowserShareHint()
    : mobileShare
      ? format === "post"
        ? "Teilen-Menü → Instagram — Bild für den Feed."
        : "Teilen-Menü → Instagram — Bild landet direkt in der Story."
      : "Teilen-Menü öffnen oder Bild speichern und in Instagram hochladen.";

  const commitVariant = useCallback(
    (next: { format?: ShareCardFormat; style?: ShareCardStyle }) => {
      setVariant((prev) => {
        const merged = { ...prev, ...next };
        if (persistVariant && vehicleId) {
          writeShareCardVariantToSession(vehicleId, merged);
        }
        return merged;
      });
    },
    [persistVariant, vehicleId],
  );

  const setFormat = useCallback(
    (nextFormat: ShareCardFormat) => {
      if (nextFormat === format) return;
      void haptics.hapticSelection();
      commitVariant({ format: nextFormat });
    },
    [commitVariant, format, haptics],
  );

  const setStyle = useCallback(
    (nextStyle: ShareCardStyle) => {
      if (nextStyle === style) return;
      void haptics.hapticSelection();
      commitVariant({ style: nextStyle });
    },
    [commitVariant, haptics, style],
  );

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const endX = event.changedTouches[0]?.clientX;
    if (endX == null) return;
    const delta = endX - start;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta < 0 && format === "story") {
      setFormat("post");
    } else if (delta > 0 && format === "post") {
      setFormat("story");
    }
  };

  const sharePreparedFile = (file: File) => {
    setActionError(null);

    if (mobileShare) {
      if (inAppBrowser) {
        setActionError(embeddedBrowserShareHint());
        return;
      }

      setIsCanvasSharing(true);
      void nativeBridge.shareContent({ files: [file] }).then((result) => {
        setIsCanvasSharing(false);
        if (result === "unavailable") {
          setActionError(
            "Teilen fehlgeschlagen — Bild gespeichert. Instagram aus der Galerie wählen.",
          );
        }
      });
      return;
    }

    void nativeBridge.shareContent({ files: [file] }).then((result) => {
      if (result === "unavailable") {
        setActionError("Teilen nicht verfügbar — bitte Bild speichern.");
      }
    });
  };

  const resolveShareFile = async (): Promise<File | null> => {
    if (shareReadyFile) {
      return shareReadyFile;
    }
    const node = exportRef.current;
    if (!node || !expectsHeroImage || !isShareCardPreviewHeroReady(node)) {
      return null;
    }
    try {
      const pngFile = await captureShareCardPngFile(node, {
        filename: storyFilename,
      });
      return await createStoryJpegForNativeShare(pngFile);
    } catch {
      return null;
    }
  };

  const handleCanvasExport = () => {
    if (isCanvasSharing) {
      return;
    }
    setIsCanvasSharing(true);
    void (async () => {
      try {
        const file = await resolveShareFile();
        if (!file) {
          setActionError(
            isPreparing
              ? "Bild wird vorbereitet — bitte kurz warten und erneut tippen."
              : prepareError ?? "Export-Bild ist noch nicht bereit.",
          );
          setIsCanvasSharing(false);
          return;
        }
        sharePreparedFile(file);
        if (!mobileShare) {
          setIsCanvasSharing(false);
        }
      } catch {
        setIsCanvasSharing(false);
      }
    })();
  };

  const handleServerExport = () => {
    setActionError(null);
    serverShare.clearError();

    if (preferCanvasShare) {
      handleCanvasExport();
      return;
    }

    if (expectsHeroImage && isPreparing) {
      setActionError(
        "Bild wird vorbereitet — bitte kurz warten und erneut tippen.",
      );
      return;
    }

    void serverShare.shareToStory().then((shared) => {
      if (!shared) {
        handleCanvasExport();
      }
    });
  };

  const isExporting = useServerOg
    ? serverShare.isSharing || isCanvasSharing
    : isPreparing || isCanvasSharing;

  const error = useServerOg
    ? actionError ?? serverShare.error
    : actionError ?? prepareError;

  const buttonDisabled = useServerOg
    ? isExporting ||
      (expectsHeroImage &&
        isPreparing &&
        !shareReadyFile &&
        !previewHeroReady)
    : isExporting || (mobileShare && !inAppBrowser && !shareReadyFile);

  const resolvedExportLabel =
    exportButtonLabel ?? exportLabelForFormat(format);

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div
        className="flex w-full max-w-sm gap-2 rounded-xl bg-white/5 p-1 ring-1 ring-white/10"
        role="tablist"
        aria-label="Format"
      >
        {(["story", "post"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={format === item}
            className={cn(
              "min-h-10 flex-1 rounded-lg text-[0.82rem] font-semibold transition-colors",
              format === item
                ? "bg-white text-black"
                : "text-white/70 hover:text-white",
            )}
            onClick={() => setFormat(item)}
          >
            {item === "story" ? "Story 9:16" : "Post 3:4"}
          </button>
        ))}
      </div>

      <div
        className="relative overflow-hidden rounded-2xl ring-1 ring-white/10 touch-pan-y"
        style={{ width: previewMaxWidth, height: previewHeight }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="origin-top-left"
          style={{
            transform: `scale(${scale})`,
            width: dims.width,
            height: dims.height,
          }}
        >
          <SpecCardPreview
            ref={exportRef}
            data={data}
            format={format}
            style={style}
          />
        </div>
      </div>

      <div
        className="flex items-center gap-2"
        aria-label="Format wischen"
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            format === "story" ? "bg-white" : "bg-white/30",
          )}
        />
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            format === "post" ? "bg-white" : "bg-white/30",
          )}
        />
      </div>

      <div
        className="flex w-full max-w-sm gap-2 rounded-xl bg-white/5 p-1 ring-1 ring-white/10"
        role="tablist"
        aria-label="Stil"
      >
        <button
          type="button"
          role="tab"
          aria-selected={style === "rankHero"}
          className={cn(
            "min-h-10 flex-1 rounded-lg px-2 text-[0.78rem] font-semibold leading-tight transition-colors",
            style === "rankHero"
              ? "bg-white text-black"
              : "text-white/70 hover:text-white",
          )}
          onClick={() => setStyle("rankHero")}
        >
          Platzierung
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={style === "showcase"}
          className={cn(
            "min-h-10 flex-1 rounded-lg px-2 text-[0.78rem] font-semibold leading-tight transition-colors",
            style === "showcase"
              ? "bg-white text-black"
              : "text-white/70 hover:text-white",
          )}
          onClick={() => setStyle("showcase")}
        >
          Showcase
        </button>
      </div>

      {showExportButton ? (
        useServerOg ? (
          <ShareBuildToStoryButton
            onShare={handleServerExport}
            isSharing={isExporting}
            disabled={buttonDisabled}
            error={error}
            className="w-full max-w-sm"
            label={resolvedExportLabel}
            pendingLabel={
              exportButtonPendingLabel ??
              (expectsHeroImage && isPreparing && !shareReadyFile
                ? "Bild wird vorbereitet…"
                : "Bild wird erstellt…")
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
                ? "Bild wird vorbereitet…"
                : resolvedExportLabel
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
