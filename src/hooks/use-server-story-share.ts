"use client";

import { useCallback, useState } from "react";

import { fetchStoryCardPngFile } from "@/lib/share/fetch-story-card-png-file";
import { embeddedBrowserShareHint } from "@/lib/share/share-story-image-file";
import { isEmbeddedSocialInAppBrowser } from "@/lib/share/story-image-for-share";
import { usePlatformServices } from "@/services/platform/context/platform-services-context";

export type UseServerStoryShareOptions = {
  vehicleId: string;
  filename: string;
};

export function useServerStoryShare({
  vehicleId,
  filename,
}: UseServerStoryShareOptions) {
  const { nativeBridge } = usePlatformServices();
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareToStory = useCallback(async () => {
    if (isEmbeddedSocialInAppBrowser()) {
      setError(embeddedBrowserShareHint());
      return;
    }

    setIsSharing(true);
    setError(null);

    try {
      const file = await fetchStoryCardPngFile(vehicleId, filename);
      const result = await nativeBridge.shareContent({ files: [file] });
      if (result === "unavailable") {
        setError(
          "Teilen fehlgeschlagen — Bild speichern und in Instagram als Story wählen.",
        );
      }
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message
          ? cause.message
          : "Story-Bild konnte nicht erstellt werden.";
      setError(message);
    } finally {
      setIsSharing(false);
    }
  }, [filename, nativeBridge, vehicleId]);

  return {
    shareToStory,
    isSharing,
    error,
    clearError: () => setError(null),
  };
}
