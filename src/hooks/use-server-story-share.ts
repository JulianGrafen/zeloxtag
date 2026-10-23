"use client";

import { useCallback, useState } from "react";

import { fetchStoryCardPngFile } from "@/lib/share/fetch-story-card-png-file";
import type {
  ShareCardFormat,
  ShareCardStyle,
} from "@/lib/share/share-card-variant";
import { embeddedBrowserShareHint } from "@/lib/share/share-story-image-file";
import { isEmbeddedSocialInAppBrowser } from "@/lib/share/story-image-for-share";
import { usePlatformServices } from "@/services/platform/context/platform-services-context";

export type UseServerStoryShareOptions = {
  vehicleId: string;
  filename: string;
  format?: ShareCardFormat;
  style?: ShareCardStyle;
};

export function useServerStoryShare({
  vehicleId,
  filename,
  format,
  style,
}: UseServerStoryShareOptions) {
  const { nativeBridge } = usePlatformServices();
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareToStory = useCallback(async (): Promise<boolean> => {
    if (isEmbeddedSocialInAppBrowser()) {
      setError(embeddedBrowserShareHint());
      return false;
    }

    setIsSharing(true);
    setError(null);

    try {
      const file = await fetchStoryCardPngFile(vehicleId, filename, {
        format,
        style,
      });
      const result = await nativeBridge.shareContent({ files: [file] });
      if (result === "unavailable") {
        setError(
          "Teilen fehlgeschlagen — Bild speichern und in Instagram als Story wählen.",
        );
        return false;
      }
      return true;
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message
          ? cause.message
          : "Story-Bild konnte nicht erstellt werden.";
      setError(message);
      return false;
    } finally {
      setIsSharing(false);
    }
  }, [filename, format, nativeBridge, style, vehicleId]);

  return {
    shareToStory,
    isSharing,
    error,
    clearError: () => setError(null),
  };
}
