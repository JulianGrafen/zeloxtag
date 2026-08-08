"use client";

import { useCallback, useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import { Camera, ImagePlus, LoaderCircle } from "lucide-react";

import { InBrowserCamera } from "@/components/documents/in-browser-camera";
import { Button } from "@/components/ui/button";
import { cropImageToJpegFile } from "@/lib/ocr/crop-image";

import "react-image-crop/dist/ReactCrop.css";

type Phase = "idle" | "camera" | "crop";

interface ImageCropCaptureProps {
  title: string;
  hint: string;
  guideLabel: string;
  stepNumber: number;
  totalSteps: number;
  onCropped: (file: File) => void;
  onClose: () => void;
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

export function ImageCropCapture({
  title,
  hint,
  guideLabel,
  stepNumber,
  totalSteps,
  onCropped,
  onClose,
  confirmLabel = "Ausschnitt übernehmen",
  isBusy = false,
}: ImageCropCaptureProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);

  const revokeSource = useCallback(() => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  function acceptSource(file: File) {
    revokeSource();
    setError(null);
    setCompletedCrop(null);
    setCrop(undefined);
    setSourceUrl(URL.createObjectURL(file));
    setPhase("crop");
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) acceptSource(file);
    event.target.value = "";
  }

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
    } finally {
      setCropping(false);
    }
  }

  if (phase === "camera") {
    return (
      <InBrowserCamera
        title={title}
        hint={hint}
        guideLabel={guideLabel}
        guideFrame="a4"
        showBriefing={false}
        continuousCapture={false}
        captureStep={{ current: stepNumber, total: totalSteps }}
        onCapture={(file) => acceptSource(file)}
        onClose={() => setPhase("idle")}
      />
    );
  }

  if (phase === "crop" && sourceUrl) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
        <div className="px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3 text-center">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/70">
            Schritt {stepNumber} von {totalSteps} · Ausschnitt
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{title}</p>
          <p className="mx-auto mt-2 max-w-md text-[0.82rem] leading-relaxed text-white/80">
            Markiere nur den Textblock mit den gesuchten Daten.
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
            onClick={() => {
              revokeSource();
              setSourceUrl(null);
              setPhase("idle");
            }}
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
                Wird analysiert…
              </span>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[color:var(--vd-bg,#f4f4f5)]">
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col gap-5 px-4 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="self-start text-[0.82rem] font-medium text-[color:var(--vd-muted)]"
        >
          Abbrechen
        </button>

        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Schritt {stepNumber} von {totalSteps}
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-[1.35rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            {title}
          </h1>
          <p className="mt-2 text-[0.92rem] leading-relaxed text-[color:var(--vd-muted)]">
            {hint}
          </p>
          <p className="mt-3 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2.5 text-[0.82rem] font-medium text-[color:var(--vd-text)]">
            Im Ausschnitt sichtbar: {guideLabel}
          </p>
        </div>

        <div className="mt-auto grid gap-2">
          <Button
            type="button"
            className="h-12"
            onClick={() => setPhase("camera")}
          >
            <Camera className="h-4 w-4" />
            Foto aufnehmen
          </Button>
          <label className="relative inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[0.92rem] font-semibold text-[color:var(--vd-text)]">
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileChange}
            />
            <ImagePlus className="h-4 w-4" />
            Aus Galerie wählen
          </label>
        </div>
      </div>
    </div>
  );
}
