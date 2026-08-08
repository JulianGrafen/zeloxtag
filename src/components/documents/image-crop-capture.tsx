"use client";

import { useEffect, useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cropImageToJpegFile } from "@/lib/ocr/crop-image";

import "react-image-crop/dist/ReactCrop.css";

interface ImageCropOverlayProps {
  sourceUrl: string;
  title: string;
  stepNumber: number;
  totalSteps: number;
  onCropped: (file: File) => void;
  onCancel: () => void;
  confirmLabel?: string;
  isBusy?: boolean;
}

function initialCrop(mediaWidth: number, mediaHeight: number): Crop {
  return centerCrop(
    makeAspectCrop(
      { unit: "%", width: 88 },
      mediaWidth / mediaHeight,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

/**
 * Full-screen crop overlay used between continuous camera captures.
 */
export function ImageCropOverlay({
  sourceUrl,
  title,
  stepNumber,
  totalSteps,
  onCropped,
  onCancel,
  confirmLabel = "Weiter",
  isBusy = false,
}: ImageCropOverlayProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);

  useEffect(() => {
    setCrop(undefined);
    setCompletedCrop(null);
    setError(null);
  }, [sourceUrl]);

  async function confirmCrop() {
    const image = imgRef.current;
    if (!image || !completedCrop) {
      setError("Bitte den relevanten Textblock markieren.");
      return;
    }
    setCropping(true);
    setError(null);
    try {
      const file = await cropImageToJpegFile(
        image,
        completedCrop,
        `abe-hunt-${stepNumber}-${Date.now()}.jpg`,
      );
      onCropped(file);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ausschnitt fehlgeschlagen.",
      );
      setCropping(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col bg-black">
      <div className="px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3 text-center">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/70">
          Schritt {stepNumber} von {totalSteps} · Ausschnitt
        </p>
        <p className="mt-1 text-sm font-semibold text-white">{title}</p>
        <p className="mx-auto mt-2 max-w-md text-[0.82rem] leading-relaxed text-white/80">
          Markiere den Textblock — danach geht es sofort weiter.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto px-3 py-2">
        <ReactCrop
          crop={crop}
          onChange={(next) => setCrop(next)}
          onComplete={(next) => setCompletedCrop(next)}
          keepSelection
          className="max-h-[min(70dvh,640px)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={sourceUrl}
            alt="Zu beschneidendes Foto"
            className="max-h-[min(70dvh,640px)] max-w-full object-contain"
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              setCrop(initialCrop(naturalWidth, naturalHeight));
            }}
          />
        </ReactCrop>
      </div>

      {error ? (
        <p className="px-4 pb-2 text-center text-[0.82rem] text-amber-200">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-white/30 bg-white/10 text-white hover:bg-white/20"
          disabled={cropping || isBusy}
          onClick={onCancel}
        >
          Neu
        </Button>
        <Button
          type="button"
          className="flex-[2]"
          disabled={cropping || isBusy || !completedCrop}
          onClick={() => void confirmCrop()}
        >
          {cropping || isBusy ? (
            <span className="inline-flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Weiter…
            </span>
          ) : (
            confirmLabel
          )}
        </Button>
      </div>
    </div>
  );
}

/** @deprecated Prefer ImageCropOverlay inside continuous camera flow. */
export const ImageCropCapture = ImageCropOverlay;
