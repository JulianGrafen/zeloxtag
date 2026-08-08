"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, LoaderCircle, RotateCcw } from "lucide-react";

import { uploadDocument } from "@/lib/documents/upload-document";
import { drawImageToCanvas, loadImageFromFile } from "@/lib/utils/image-loader";
import type { QuadPoints } from "@/lib/utils/perspective";
import { buildScanFromCorners } from "@/lib/utils/scan-pipeline";
import type { DocumentType } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";

import { CameraCapture } from "./camera-capture";
import { DocumentCornerEditor } from "./document-corner-editor";

/** App-level scan categories (mapped onto documents.type). */
export const SCAN_CATEGORIES = ["tuning", "service", "other"] as const;

export type ScanCategory = (typeof SCAN_CATEGORIES)[number];

const SCAN_CATEGORY_LABELS: Record<ScanCategory, string> = {
  tuning: "Tuning",
  service: "Service",
  other: "Sonstiges",
};

function mapCategoryToDocumentType(category: ScanCategory): DocumentType {
  if (category === "other") return "other";
  return "invoice";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface InvoiceScannerFormProps {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
}

type ScanStep = "capture" | "crop" | "processing" | "ready";

export function InvoiceScannerForm({
  vehicleId,
  tagUuid,
  vehicleLabel,
}: InvoiceScannerFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<ScanStep>("capture");
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ScanCategory>("service");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleImageSelected(file: File) {
    setError(null);
    setPreviewUrl(null);
    setPdfFile(null);
    setPdfBytes(null);
    setStep("processing");

    try {
      const image = await loadImageFromFile(file);
      // Working resolution for smooth corner dragging on phones.
      const canvas = drawImageToCanvas(image, 2048);
      setSourceCanvas(canvas);
      setStep("crop");
    } catch (loadError) {
      setStep("capture");
      setSourceCanvas(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Bild konnte nicht geladen werden.",
      );
    }
  }

  async function handleCornersConfirmed(corners: QuadPoints) {
    if (!sourceCanvas) return;

    setError(null);
    setStep("processing");

    try {
      // Yield so the processing UI can paint before heavy canvas work.
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 16);
      });

      const result = await buildScanFromCorners(sourceCanvas, corners);

      setPreviewUrl(result.previewDataUrl);
      setPdfFile(result.pdf.file);
      setPdfBytes(result.pdf.byteLength);
      setStep("ready");

      if (!title.trim()) {
        const stamp = new Date().toLocaleDateString("de-DE");
        setTitle(`Rechnung ${stamp}`);
      }
    } catch (processError) {
      setStep("crop");
      setError(
        processError instanceof Error
          ? processError.message
          : "Bildverarbeitung fehlgeschlagen.",
      );
    }
  }

  function resetScan() {
    setStep("capture");
    setSourceCanvas(null);
    setPreviewUrl(null);
    setPdfFile(null);
    setPdfBytes(null);
    setError(null);
  }

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
      <header className="vd-anim-header space-y-4">
        <PressableLink
          href={`/v/${tagUuid}/dokumente`}
          variant="pill"
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Zurück
        </PressableLink>

        <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            Dokument-Scanner
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
            Rechnung scannen
          </h1>
          <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
            {vehicleLabel} · Zuschnitt, Graustufen & A4-PDF lokal
          </p>
        </div>
      </header>

      {step === "capture" ? (
        <div className="vd-anim-header">
          <CameraCapture
            inBrowserA4Camera={{
              title: "Rechnung scannen",
              hint: "Rechnung frei fotografieren — danach kannst du die Ecken anpassen.",
            }}
            onFileSelected={(file) => {
              void handleImageSelected(file);
            }}
          />
        </div>
      ) : null}

      {step === "crop" && sourceCanvas ? (
        <div className="vd-anim-header">
          <DocumentCornerEditor
            sourceCanvas={sourceCanvas}
            onConfirm={(corners) => {
              void handleCornersConfirmed(corners);
            }}
            onCancel={resetScan}
          />
        </div>
      ) : null}

      {step === "processing" ? (
        <p className="vd-anim-header flex items-center justify-center gap-2 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white px-4 py-10 text-[0.9rem] text-[color:var(--vd-muted)]">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          {sourceCanvas
            ? "Perspektivkorrektur & PDF wird erzeugt…"
            : "Bild wird geladen…"}
        </p>
      ) : null}

      {step === "ready" && previewUrl && pdfFile ? (
        <form
          className="vd-anim-header space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);

            if (!title.trim()) {
              setError("Titel ist erforderlich.");
              return;
            }

            startTransition(async () => {
              const formData = new FormData();
              const docType = mapCategoryToDocumentType(category);
              formData.set("vehicleId", vehicleId);
              formData.set("tagUuid", tagUuid);
              formData.set("title", title.trim());
              formData.set("type", docType);
              formData.set("date", date);
              formData.set("amount", amount);
              formData.set("file", pdfFile);

              const result = await uploadDocument(formData);
              if (result.status === "error") {
                setError(result.message);
                return;
              }

              router.push(
                `/v/${result.tagUuid}/dokumente?type=${result.document.type}`,
              );
              router.refresh();
            });
          }}
        >
          <div className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white shadow-[var(--vd-shadow-sm)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Optimierte Rechnungsvorschau"
              className="max-h-[48vh] w-full object-contain bg-neutral-100"
            />
            <div className="flex items-center justify-between gap-3 border-t border-[color:var(--vd-border)] px-3 py-2.5 text-[0.75rem] text-[color:var(--vd-muted)]">
              <span>
                A4-PDF bereit{pdfBytes ? ` · ${formatBytes(pdfBytes)}` : ""}
              </span>
              <button
                type="button"
                onClick={resetScan}
                className="inline-flex items-center gap-1 font-medium text-[color:var(--vd-text)]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Neu scannen
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
            <Label>
              <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                Titel
              </span>
              <Input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="z. B. Ölwechsel Beleg"
              />
            </Label>

            <Label>
              <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                Kategorie
              </span>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as ScanCategory)
                }
                className="claim-input"
              >
                {SCAN_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {SCAN_CATEGORY_LABELS[option]}
                  </option>
                ))}
              </select>
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <Label>
                <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                  Betrag (€)
                </span>
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="optional"
                />
              </Label>
              <Label>
                <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                  Datum
                </span>
                <Input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </Label>
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="claim-cta">
            {pending ? "Speichern…" : "PDF speichern"}
          </Button>
        </form>
      ) : null}

      {error && step !== "ready" ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
        >
          {error}
        </p>
      ) : null}

      {step === "capture" ? (
        <PressableLink
          href={`/v/${tagUuid}/hochladen?mode=manual`}
          variant="pill"
          nav="none"
          className="block text-center text-[0.82rem] font-medium text-[color:var(--vd-muted)]"
        >
          Stattdessen Datei manuell hochladen
        </PressableLink>
      ) : null}
    </section>
  );
}
