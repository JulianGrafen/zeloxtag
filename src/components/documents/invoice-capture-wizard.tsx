"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  FileUp,
  ImagePlus,
  Plus,
  Trash2,
} from "lucide-react";

import { InBrowserCamera } from "@/components/documents/in-browser-camera";

const IMAGE_ACCEPT = "image/*";
const PDF_ACCEPT = "application/pdf,.pdf";
const MAX_POSITION_BLOCKS = 8;

export const INVOICE_CAPTURE_HINTS = {
  overview: "Ganze Seite ins A4-Feld",
  positions: (blockNumber: number) =>
    blockNumber > 1
      ? `Block ${blockNumber} — nächste Tabelle`
      : "Pos · Menge · Preise im Rahmen",
  intro:
    "Ein Foto der ganzen Seite reicht — Positionsblock nur bei Bedarf nachscannen.",
} as const;

type CapturePhase =
  | "intro"
  | "capture-overview"
  | "capture-positions"
  | "hub";

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function StepProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <span
            key={step}
            className={[
              "inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full px-2 text-[0.68rem] font-semibold",
              done
                ? "bg-emerald-600 text-white"
                : active
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-200 text-neutral-500",
            ].join(" ")}
          >
            {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : step}
          </span>
        );
      })}
    </div>
  );
}

export interface InvoiceCaptureWizardProps {
  title: string;
  scanLabel?: string;
  disabled?: boolean;
  allowPdf?: boolean;
  /** Called when the 2-step scan (or PDF) is complete — files in order: overview, then blocks. */
  onComplete?: (files: File[]) => void;
  /** Single-file fallback (add-page variant). */
  onFileSelected?: (file: File) => void;
  variant?: "initial" | "add-page";
  imageButtonLabel?: string;
  cameraButtonLabel?: string;
  pdfButtonLabel?: string;
  hint?: string;
}

function FilePickerLabel({
  disabled,
  accept,
  onChange,
  variant,
  children,
}: {
  disabled: boolean;
  accept: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  variant: "primary" | "secondary";
  children: React.ReactNode;
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
        disabled={disabled}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        onChange={onChange}
      />
      {children}
    </label>
  );
}

function PositionsCamera({
  blockNumber,
  onCapture,
  onClose,
}: {
  blockNumber: number;
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  return (
    <InBrowserCamera
      title={blockNumber > 1 ? `Block ${blockNumber}` : "Rechnungsblock"}
      hint={INVOICE_CAPTURE_HINTS.positions(blockNumber)}
      guideLabel="Pos · Menge · Preise"
      guideFrame="section"
      guideSectionAnchor="center"
      guideFrameDimOutside
      showBriefing={false}
      enforceCaptureQuality
      allowOpticalZoom
      captureStep={{ current: 2, total: 2 }}
      onCapture={onCapture}
      onClose={onClose}
    />
  );
}

export function InvoiceCaptureWizard({
  title,
  scanLabel = "Rechnung",
  disabled = false,
  allowPdf = false,
  onComplete,
  onFileSelected,
  variant = "initial",
  imageButtonLabel = "Bild hochladen",
  cameraButtonLabel = "Scannen",
  pdfButtonLabel = "PDF",
  hint,
}: InvoiceCaptureWizardProps) {
  const [phase, setPhase] = useState<CapturePhase>("intro");
  const [overviewFile, setOverviewFile] = useState<File | null>(null);
  const [overviewPreviewUrl, setOverviewPreviewUrl] = useState<string | null>(
    null,
  );
  const [positionFiles, setPositionFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [addPageCameraOpen, setAddPageCameraOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (overviewPreviewUrl) URL.revokeObjectURL(overviewPreviewUrl);
      for (const url of previewUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [overviewPreviewUrl, previewUrls]);

  function emitComplete(files: File[]) {
    if (onComplete) {
      onComplete(files);
      return;
    }
    for (const file of files) {
      onFileSelected?.(file);
    }
  }

  function handlePdfSelected(file: File) {
    emitComplete([file]);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    if (isPdfFile(file)) {
      handlePdfSelected(file);
      return;
    }
    onFileSelected?.(file);
  }

  function handleOverviewCapture(file: File) {
    setOverviewFile(file);
    setOverviewPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setPhase("hub");
  }

  function handlePositionCapture(file: File) {
    setPositionFiles((current) => [...current, file]);
    setPreviewUrls((current) => [...current, URL.createObjectURL(file)]);
    setPhase("hub");
  }

  function finishWizard() {
    if (!overviewFile) return;
    emitComplete(
      positionFiles.length > 0
        ? [overviewFile, ...positionFiles]
        : [overviewFile],
    );
  }

  function removePositionBlock(index: number) {
    setPositionFiles((current) => current.filter((_, i) => i !== index));
    setPreviewUrls((current) => {
      const removed = current[index];
      if (removed) URL.revokeObjectURL(removed);
      return current.filter((_, i) => i !== index);
    });
  }

  function resetWizard() {
    if (overviewPreviewUrl) URL.revokeObjectURL(overviewPreviewUrl);
    for (const url of previewUrls) {
      URL.revokeObjectURL(url);
    }
    setOverviewFile(null);
    setOverviewPreviewUrl(null);
    setPositionFiles([]);
    setPreviewUrls([]);
    setPhase("intro");
  }

  if (variant === "add-page") {
    return (
      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setAddPageCameraOpen(true)}
          className={[
            "claim-back inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden",
            disabled ? "pointer-events-none opacity-50" : "",
          ].join(" ")}
        >
          <Camera className="h-4 w-4" aria-hidden />
          <span>{cameraButtonLabel}</span>
        </button>

        <FilePickerLabel
          disabled={disabled}
          accept={IMAGE_ACCEPT}
          onChange={handleFileChange}
          variant="secondary"
        >
          <ImagePlus className="relative z-0 h-4 w-4" aria-hidden />
          <span className="relative z-0">{imageButtonLabel}</span>
        </FilePickerLabel>

        {addPageCameraOpen ? (
          <PositionsCamera
            blockNumber={1}
            onCapture={(file) => {
              onFileSelected?.(file);
              setAddPageCameraOpen(false);
            }}
            onClose={() => setAddPageCameraOpen(false)}
          />
        ) : null}
      </div>
    );
  }

  if (phase === "capture-overview") {
    return (
      <InBrowserCamera
        title="Gesamtseite"
        hint={INVOICE_CAPTURE_HINTS.overview}
        guideLabel={`${scanLabel} · A4`}
        guideFrame="a4"
        guideFrameDimOutside
        a4AutoCrop
        a4OutputFormat="jpeg"
        showFramingGuide
        showBriefing={false}
        allowOpticalZoom
        enforceCaptureQuality
        captureStep={{ current: 1, total: 1 }}
        onCapture={handleOverviewCapture}
        onClose={() => {
          if (overviewFile || positionFiles.length > 0) {
            if (
              !window.confirm("Scan abbrechen? Erfasste Fotos gehen verloren.")
            ) {
              return;
            }
          }
          resetWizard();
        }}
      />
    );
  }

  if (phase === "capture-positions") {
    const blockNumber = positionFiles.length + 1;
    return (
      <PositionsCamera
        blockNumber={blockNumber}
        onCapture={handlePositionCapture}
        onClose={() => {
          if (positionFiles.length > 0) {
            setPhase("hub");
            return;
          }
          setPhase("capture-overview");
        }}
      />
    );
  }

  if (phase === "hub" && overviewFile) {
    const canAddMore = positionFiles.length < MAX_POSITION_BLOCKS;
    const captureSteps = positionFiles.length > 0 ? 2 : 1;

    return (
      <div className="space-y-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.88rem] font-semibold text-[color:var(--vd-text)]">
            {positionFiles.length > 0
              ? `A4 + ${positionFiles.length} ${
                  positionFiles.length === 1 ? "Block" : "Blöcke"
                }`
              : "1 Foto erfasst"}
          </p>
          <StepProgress current={captureSteps} total={captureSteps} />
        </div>

        <ul className="grid grid-cols-3 gap-2">
          <li className="relative overflow-hidden rounded-xl border border-emerald-300 bg-emerald-50">
            {overviewPreviewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={overviewPreviewUrl}
                alt="Gesamtseite"
                className="aspect-[3/4] w-full object-cover"
              />
            ) : null}
            <span className="absolute left-1.5 top-1.5 rounded-md bg-emerald-700 px-1.5 py-0.5 text-[0.62rem] font-semibold text-white">
              A4
            </span>
          </li>

          {previewUrls.map((url, index) => (
            <li
              key={url}
              className="relative overflow-hidden rounded-xl border border-[color:var(--vd-border)] bg-neutral-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Rechnungsblock ${index + 1}`}
                className="aspect-[4/3] w-full object-cover"
              />
              <span className="absolute left-1.5 top-1.5 rounded-md bg-neutral-900/85 px-1.5 py-0.5 text-[0.62rem] font-semibold text-white">
                Block {index + 1}
              </span>
              <button
                type="button"
                aria-label={`Block ${index + 1} entfernen`}
                onClick={() => removePositionBlock(index)}
                className="absolute bottom-1.5 right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-neutral-800 shadow"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>

        {canAddMore ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setPhase("capture-positions")}
            className="claim-back inline-flex w-full items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Positionsblock fotografieren (optional)
          </button>
        ) : null}

        <button
          type="button"
          disabled={disabled}
          onClick={finishWizard}
          className="claim-cta inline-flex w-full items-center justify-center gap-2 disabled:opacity-50"
        >
          <Check className="h-4 w-4" aria-hidden />
          Erkennen
        </button>

        <button
          type="button"
          onClick={resetWizard}
          className="inline-flex w-full items-center justify-center gap-2 text-[0.78rem] font-medium text-[color:var(--vd-muted)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Neu starten
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[1.35rem] border border-dashed border-[color:var(--vd-border)] bg-white px-4 py-4">
      <h2 className="sr-only">{title}</h2>
      <p className="text-center text-[0.8rem] leading-snug text-[color:var(--vd-muted)]">
        {hint ?? INVOICE_CAPTURE_HINTS.intro}
      </p>

      <div className={allowPdf ? "grid grid-cols-2 gap-2" : "grid grid-cols-1"}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setPhase("capture-overview")}
          className={[
            "claim-cta inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden",
            disabled ? "pointer-events-none opacity-50" : "",
          ].join(" ")}
        >
          <Camera className="h-4 w-4" aria-hidden />
          <span>{cameraButtonLabel}</span>
        </button>

        {allowPdf ? (
          <FilePickerLabel
            disabled={disabled}
            accept={PDF_ACCEPT}
            onChange={handleFileChange}
            variant="secondary"
          >
            <FileUp className="relative z-0 h-4 w-4" aria-hidden />
            <span className="relative z-0">{pdfButtonLabel}</span>
          </FilePickerLabel>
        ) : null}
      </div>
    </div>
  );
}
