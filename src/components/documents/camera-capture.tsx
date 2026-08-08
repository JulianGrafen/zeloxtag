"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { Camera, FileUp, ImagePlus } from "lucide-react";

import { InBrowserCamera } from "@/components/documents/in-browser-camera";

export interface InBrowserA4CameraOptions {
  title?: string;
  hint?: string;
  guideLabel?: string;
  /** Keep the live stream open between captures (multi-page scans). */
  continuousCapture?: boolean;
}

interface CameraCaptureProps {
  disabled?: boolean;
  onFileSelected: (file: File) => void;
  label?: string;
  hint?: string;
  /** When true, show a native PDF picker (`application/pdf`). */
  allowPdf?: boolean;
  /** Optional label override for the gallery/image button. */
  imageButtonLabel?: string;
  cameraButtonLabel?: string;
  pdfButtonLabel?: string;
  /** Opens InBrowserCamera with a DIN A4 viewfinder instead of the native camera app. */
  inBrowserA4Camera?: InBrowserA4CameraOptions;
}

const IMAGE_ACCEPT = "image/*";
const PDF_ACCEPT = "application/pdf,.pdf";

function CaptureLabel({
  disabled,
  capture,
  accept,
  onChange,
  variant,
  children,
}: {
  disabled: boolean;
  capture?: boolean;
  accept: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  variant: "primary" | "secondary";
  children: ReactNode;
}) {
  const className =
    variant === "primary"
      ? "claim-cta relative inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden"
      : "claim-back relative inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden";

  return (
    <label
      className={[className, disabled ? "pointer-events-none opacity-50" : ""].join(
        " ",
      )}
    >
      <input
        type="file"
        accept={accept}
        {...(capture ? { capture: "environment" as const } : {})}
        disabled={disabled}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        onChange={onChange}
      />
      {children}
    </label>
  );
}

/**
 * Mobile-first capture via real <label> hit-targets (reliable on iOS).
 */
export function CameraCapture({
  disabled = false,
  onFileSelected,
  label = "Rechnung fotografieren",
  hint = "Bilder oder PDF wählen — mehrseitige Belege möglich",
  allowPdf = false,
  imageButtonLabel = "Bild hochladen",
  cameraButtonLabel = "Kamera",
  pdfButtonLabel = "PDF hochladen",
  inBrowserA4Camera,
}: CameraCaptureProps) {
  const [cameraOpen, setCameraOpen] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onFileSelected(file);
    event.target.value = "";
  }

  function handleInBrowserCapture(file: File) {
    onFileSelected(file);
    if (!inBrowserA4Camera?.continuousCapture) {
      setCameraOpen(false);
    }
  }

  return (
    <div className="space-y-3 rounded-[1.35rem] border border-dashed border-[color:var(--vd-border)] bg-white px-4 py-6 text-center">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 text-white">
        <ImagePlus className="h-6 w-6" aria-hidden />
      </span>

      <div className="space-y-1">
        <p className="text-[0.95rem] font-semibold text-[color:var(--vd-text)]">
          {label}
        </p>
        <p className="text-[0.78rem] text-[color:var(--vd-muted)]">{hint}</p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <CaptureLabel
          disabled={disabled}
          accept={IMAGE_ACCEPT}
          onChange={handleChange}
          variant="primary"
        >
          <ImagePlus className="relative z-0 h-4 w-4" aria-hidden />
          <span className="relative z-0">{imageButtonLabel}</span>
        </CaptureLabel>

        {inBrowserA4Camera ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setCameraOpen(true)}
            className={[
              "claim-back inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden",
              disabled ? "pointer-events-none opacity-50" : "",
            ].join(" ")}
          >
            <Camera className="h-4 w-4" aria-hidden />
            <span>{cameraButtonLabel}</span>
          </button>
        ) : (
          <CaptureLabel
            disabled={disabled}
            capture
            accept={IMAGE_ACCEPT}
            onChange={handleChange}
            variant="secondary"
          >
            <Camera className="relative z-0 h-4 w-4" aria-hidden />
            <span className="relative z-0">{cameraButtonLabel}</span>
          </CaptureLabel>
        )}

        {allowPdf ? (
          <CaptureLabel
            disabled={disabled}
            accept={PDF_ACCEPT}
            onChange={handleChange}
            variant="secondary"
          >
            <FileUp className="relative z-0 h-4 w-4" aria-hidden />
            <span className="relative z-0">{pdfButtonLabel}</span>
          </CaptureLabel>
        ) : null}
      </div>

      {cameraOpen && inBrowserA4Camera ? (
        <InBrowserCamera
          title={inBrowserA4Camera.title ?? label}
          hint={
            inBrowserA4Camera.hint ??
            "Rechnung frei fotografieren — danach automatische Verarbeitung."
          }
          guideFrame="none"
          allowPdf={false}
          showBriefing={false}
          continuousCapture={inBrowserA4Camera.continuousCapture}
          onCapture={handleInBrowserCapture}
          onClose={() => setCameraOpen(false)}
        />
      ) : null}
    </div>
  );
}
