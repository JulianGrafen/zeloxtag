"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { SHAREABLE_SPEC_CARD_EXPORT_PIXEL_RATIO } from "@/components/shareable-spec-card/constants";
import { captureShareCardPngFile } from "@/lib/share/capture-share-card-png-file";
import { createStoryJpegForNativeShare } from "@/lib/share/story-image-for-share";

type UsePreparedStoryFileOptions = {
  filename: string;
  /** When this changes, the PNG is regenerated in the background. */
  cacheKey: string;
  enabled?: boolean;
};

/**
 * Pre-renders the Story PNG so mobile Web Share can run synchronously on tap
 * (iOS drops user activation after async PNG export inside the click handler).
 */
export function usePreparedStoryFile(
  targetRef: RefObject<HTMLElement | null>,
  options: UsePreparedStoryFileOptions,
) {
  const { filename, cacheKey, enabled = true } = options;
  const [storyFile, setStoryFile] = useState<File | null>(null);
  /** JPEG tuned for iOS / Instagram via Web Share (pre-built before tap). */
  const [nativeShareFile, setNativeShareFile] = useState<File | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setStoryFile(null);
      setNativeShareFile(null);
      setIsPreparing(false);
      setPrepareError(null);
      return;
    }

    let cancelled = false;
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setStoryFile(null);
    setNativeShareFile(null);
    setIsPreparing(true);
    setPrepareError(null);

    const runCapture = () => {
      if (cancelled) {
        return;
      }
      const node = targetRef.current;
      if (!node) {
        requestAnimationFrame(runCapture);
        return;
      }

      void captureShareCardPngFile(node, {
        filename,
        pixelRatio: SHAREABLE_SPEC_CARD_EXPORT_PIXEL_RATIO,
      })
        .then(async (pngFile) => {
          if (cancelled || generationRef.current !== generation) {
            return;
          }
          const jpegFile = await createStoryJpegForNativeShare(pngFile);
          if (cancelled || generationRef.current !== generation) {
            return;
          }
          setStoryFile(pngFile);
          setNativeShareFile(jpegFile);
          setPrepareError(null);
        })
        .catch((cause: unknown) => {
          if (cancelled || generationRef.current !== generation) {
            return;
          }
          setStoryFile(null);
          setNativeShareFile(null);
          setPrepareError(
            cause instanceof Error
              ? cause.message
              : "Story-Vorschau fehlgeschlagen.",
          );
        })
        .finally(() => {
          if (!cancelled && generationRef.current === generation) {
            setIsPreparing(false);
          }
        });
    };

    runCapture();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, enabled, filename, targetRef]);

  return { storyFile, nativeShareFile, isPreparing, prepareError };
}
