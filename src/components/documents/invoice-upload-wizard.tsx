"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  LoaderCircle,
  RotateCcw,
  ScanLine,
} from "lucide-react";

import { EditableLineItemsSection } from "@/components/documents/editable-line-items-section";
import { InBrowserCamera } from "@/components/documents/in-browser-camera";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildInvoiceDashboardTitle,
  isPrimaryOilChange,
} from "@/lib/documents/invoice-title";
import { detectOilChangeInvoice } from "@/lib/documents/oil-changes";
import { scanTypeDefinition, type ScanType } from "@/lib/documents/scan-types";
import { uploadDocument } from "@/lib/documents/upload-document";
import { documentTypeForTextCategory } from "@/lib/ocr/category-map";
import {
  INVOICE_TEXT_PARSE_CATEGORIES,
  type InvoiceTextParseCategory,
  type InvoiceTextParseResult,
} from "@/lib/ocr/text-parse-schema";
import { convertImagesToPdf } from "@/lib/utils/pdf-converter";
import {
  mergeInvoiceWizardExtractions,
  type InvoiceHeaderExtraction,
  type InvoiceLineItemsExtraction,
  type InvoiceOverviewExtraction,
} from "@/services/ocr/InvoiceExtractionService";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";

type WizardPhase =
  | "capture-overview"
  | "capture-header"
  | "capture-line-items"
  | "analyzing"
  | "review";

interface WizardState {
  phase: WizardPhase;
  overviewFile: File | null;
  headerFile: File | null;
  lineItemsFile: File | null;
  overviewExtraction: InvoiceOverviewExtraction | null;
  headerExtraction: InvoiceHeaderExtraction | null;
  lineItemsExtraction: InvoiceLineItemsExtraction | null;
  fields: InvoiceTextParseResult | null;
  uploadFile: File | null;
  previewUrl: string | null;
  previewOwned: boolean;
  title: string;
  error: string | null;
}

export interface InvoiceUploadWizardProps {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
  scanType: ScanType;
  successHref?: string;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
}

const CATEGORY_LABELS: Record<InvoiceTextParseCategory, string> = {
  tuning: "Tuning",
  service: "Service / Inspektion",
  tuev: "TÜV / HU",
  repair: "Reparatur",
  abe: "ABE / Gutachten",
  other: "Sonstiges",
};

class InvoiceApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceApiError";
  }
}

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function callInvoiceStep<T>(
  file: File,
  step: string,
  label: string,
  lockedCategory?: InvoiceTextParseCategory | null,
): Promise<T> {
  const body = new FormData();
  body.set("file", file);
  body.set("step", step);
  if (lockedCategory) {
    body.set("lockedCategory", lockedCategory);
  }

  const response = await fetch("/api/ocr/invoice", { method: "POST", body });
  const payload = (await response.json().catch(() => null)) as
    | { ok: true; extraction: T }
    | { ok: false; error?: string }
    | null;

  if (!response.ok || !payload || payload.ok !== true) {
    throw new InvoiceApiError(
      payload && "error" in payload && payload.error
        ? payload.error
        : `${label} fehlgeschlagen (${response.status}).`,
    );
  }
  return (payload as { ok: true; extraction: T }).extraction;
}

async function buildUploadFile(
  overviewFile: File | null,
  headerFile: File | null,
  lineItemsFile: File | null,
): Promise<File | null> {
  const pages = [overviewFile, headerFile, lineItemsFile].filter(
    (file): file is File => file !== null,
  );

  if (pages.length === 0) return null;
  if (pages.length === 1 && isPdfFile(pages[0]!)) return pages[0]!;

  const unique = pages.filter(
    (file, index) =>
      pages.findIndex(
        (candidate) =>
          candidate.name === file.name && candidate.size === file.size,
      ) === index,
  );

  if (unique.length === 1 && isPdfFile(unique[0]!)) return unique[0]!;

  try {
    const result = await convertImagesToPdf(unique, {
      fileName: `invoice-scan-${Date.now()}`,
      fullBleed: true,
      imageCompression: "MEDIUM",
    });
    return result.file;
  } catch {
    return unique[0]!;
  }
}

function WizardProgress({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`Schritt ${currentStep} von ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }, (_, index) => (
        <div
          key={index}
          className={[
            "h-1.5 flex-1 rounded-full transition-colors duration-300",
            index < currentStep ? "bg-neutral-900" : "bg-neutral-200",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-[0.8rem] text-[color:var(--vd-muted)]">{label}</span>
      <span className="text-[0.85rem] font-medium text-[color:var(--vd-text)]">
        {value ?? "—"}
      </span>
    </div>
  );
}

export function InvoiceUploadWizard({
  vehicleId,
  tagUuid,
  vehicleLabel,
  scanType,
  successHref,
  onBack,
  backHref,
  backLabel = "Zurück",
}: InvoiceUploadWizardProps) {
  const scanDef = scanTypeDefinition(scanType);
  const resolvedHeading = scanDef.heading;
  const lockedCategory = scanDef.lockCategory ? scanDef.category : null;

  const [state, setState] = useState<WizardState>({
    phase: "capture-overview",
    overviewFile: null,
    headerFile: null,
    lineItemsFile: null,
    overviewExtraction: null,
    headerExtraction: null,
    lineItemsExtraction: null,
    fields: null,
    uploadFile: null,
    previewUrl: null,
    previewOwned: false,
    title: "",
    error: null,
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, startSaveTransition] = useTransition();
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function setPreviewUrl(url: string | null, owned: boolean) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = owned && url ? url : null;
    setState((prev) => ({ ...prev, previewUrl: url, previewOwned: owned }));
  }

  function resetWizard() {
    setPreviewUrl(null, false);
    setState({
      phase: "capture-overview",
      overviewFile: null,
      headerFile: null,
      lineItemsFile: null,
      overviewExtraction: null,
      headerExtraction: null,
      lineItemsExtraction: null,
      fields: null,
      uploadFile: null,
      previewUrl: null,
      previewOwned: false,
      title: "",
      error: null,
    });
    setSaveError(null);
  }

  function handleOverviewCapture(file: File) {
    if (isPdfFile(file)) {
      setState((prev) => ({
        ...prev,
        overviewFile: file,
        headerFile: file,
        lineItemsFile: file,
        phase: "analyzing",
        error: null,
      }));
      void runAnalysis(file, file, file);
      return;
    }

    setState((prev) => ({
      ...prev,
      overviewFile: file,
      phase: "capture-header",
      error: null,
    }));
  }

  function handleHeaderCapture(file: File) {
    setState((prev) => ({
      ...prev,
      headerFile: file,
      phase: "capture-line-items",
      error: null,
    }));
  }

  function handleLineItemsCapture(file: File) {
    const { overviewFile, headerFile } = state;
    setState((prev) => ({
      ...prev,
      lineItemsFile: file,
      phase: "analyzing",
      error: null,
    }));
    void runAnalysis(overviewFile, headerFile, file);
  }

  async function runAnalysis(
    overviewFile: File | null,
    headerFile: File | null,
    lineItemsFile: File | null,
  ) {
    try {
      if (!headerFile) {
        throw new InvoiceApiError("Kein Kopf-Bild vorhanden.");
      }
      if (!lineItemsFile) {
        throw new InvoiceApiError("Kein Positions-Bild vorhanden.");
      }

      const [overviewResult, headerResult, lineItemsResult] = await Promise.all([
        overviewFile
          ? callInvoiceStep<InvoiceOverviewExtraction>(
              overviewFile,
              "overview",
              "Übersicht-Analyse",
              lockedCategory,
            )
          : Promise.resolve(null),
        callInvoiceStep<InvoiceHeaderExtraction>(
          headerFile,
          "header",
          "Kopf-Analyse",
          lockedCategory,
        ),
        callInvoiceStep<InvoiceLineItemsExtraction>(
          lineItemsFile,
          "line-items",
          "Positions-Analyse",
          lockedCategory,
        ),
      ]);

      const fields = mergeInvoiceWizardExtractions(
        overviewResult,
        headerResult,
        lineItemsResult,
        { lockedCategory },
      );

      const uploadFile = await buildUploadFile(
        overviewFile,
        headerFile,
        lineItemsFile,
      );
      const previewSource = lineItemsFile ?? headerFile ?? overviewFile;
      const owned =
        previewSource !== null && !previewSource.type.includes("pdf");
      const previewUrl =
        owned && previewSource ? URL.createObjectURL(previewSource) : null;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = previewUrl;

      const defaultTitle =
        fields.summary?.trim() ||
        fields.vendor?.trim() ||
        scanDef.title ||
        "Rechnung";

      setState((prev) => ({
        ...prev,
        phase: "review",
        overviewExtraction: overviewResult,
        headerExtraction: headerResult,
        lineItemsExtraction: lineItemsResult,
        fields,
        uploadFile,
        previewUrl,
        previewOwned: owned,
        title: defaultTitle,
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        phase: "capture-line-items",
        error:
          err instanceof Error
            ? err.message
            : "Analyse fehlgeschlagen. Bitte erneut versuchen.",
      }));
    }
  }

  function handleSave(event: FormEvent) {
    event.preventDefault();
    const { fields, uploadFile, title } = state;
    if (!fields || !uploadFile) {
      setSaveError("Keine Datei zum Speichern vorhanden.");
      return;
    }

    const resolvedTitle = title.trim();
    if (!resolvedTitle) {
      setSaveError("Titel ist erforderlich.");
      return;
    }

    setSaveError(null);
    startSaveTransition(async () => {
      const oil = detectOilChangeInvoice({
        title: resolvedTitle,
        summary: resolvedTitle,
        vendor: fields.vendor,
        category: fields.category,
        notes: fields.notes,
        lineItems: fields.lineItems,
        rawText: null,
      });
      const oilPrimary = isPrimaryOilChange({
        summary: resolvedTitle,
        vendor: fields.vendor,
        category: fields.category,
        lineItems: fields.lineItems,
        rawText: null,
        oil,
      });

      const category = oilPrimary ? "service" : fields.category;
      const storedTitle = buildInvoiceDashboardTitle({
        summary: resolvedTitle,
        vendor: fields.vendor,
        category,
        lineItems: fields.lineItems,
        rawText: null,
        oil,
      });

      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("title", storedTitle);
      formData.set("type", documentTypeForTextCategory(category));
      formData.set("category", category);
      formData.set("vendor", fields.vendor?.trim() ?? "");
      formData.set("date", fields.date ?? "");
      formData.set(
        "amount",
        fields.amount === null || fields.amount === undefined
          ? ""
          : String(fields.amount),
      );
      formData.set(
        "lineItems",
        fields.lineItems?.length ? JSON.stringify(fields.lineItems) : "",
      );
      formData.set("kbaNumber", "");
      formData.set("vehicleApprovals", "");
      formData.set("authority", "");
      formData.set("conditions", "");
      formData.set("technicalSpecs", "");
      formData.set("partCategory", "");
      formData.set(
        "notes",
        oil.isOilChange
          ? (fields.notes?.trim() || oil.notes)
          : (fields.notes?.trim() ?? ""),
      );
      formData.set("manufacturer", "");
      formData.set("invoiceNumber", fields.invoiceNumber?.trim() ?? "");
      formData.set(
        "mileageKm",
        fields.mileageKm === null || fields.mileageKm === undefined
          ? ""
          : String(fields.mileageKm),
      );
      const pageCount = [
        state.overviewFile,
        state.headerFile,
        state.lineItemsFile,
      ].filter(Boolean).length;
      formData.set("pageCount", String(pageCount || 1));
      formData.set("approvalFields", "");
      formData.set("file", uploadFile);

      const result = await uploadDocument(formData);
      if (result.status === "error") {
        setSaveError(result.message);
        return;
      }

      const href =
        successHref ?? `/v/${result.tagUuid}/dokumente/${result.document.id}`;
      window.location.assign(href);
    });
  }

  const { phase, fields, uploadFile, previewUrl, title, error } = state;

  if (phase === "capture-overview") {
    return (
      <>
        {error ? (
          <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
            {error}
          </div>
        ) : null}
        <InBrowserCamera
          title={resolvedHeading}
          hint="Schritt 1 von 3 · Gesamtes Blatt"
          guideFrame="a4"
          guideLabel="Gesamte Rechnung im DIN-A4-Rahmen"
          allowPdf
          onCapture={handleOverviewCapture}
          onClose={() => {
            if (onBack) {
              onBack();
              return;
            }
            if (backHref) {
              window.location.assign(backHref);
            }
          }}
        />
      </>
    );
  }

  if (phase === "capture-header") {
    return (
      <>
        {error ? (
          <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
            {error}
          </div>
        ) : null}
        <InBrowserCamera
          title="Rechnungskopf fotografieren"
          hint="Schritt 2 von 3 · Werkstatt, Datum, KM-Stand"
          guideFrame="section"
          guideSectionAnchor="top"
          guideLabel="Kopf mit Werkstattname, Belegnr., km-Stand"
          onCapture={handleHeaderCapture}
          onClose={() =>
            setState((prev) => ({ ...prev, phase: "capture-overview" }))
          }
        />
      </>
    );
  }

  if (phase === "capture-line-items") {
    return (
      <>
        {error ? (
          <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
            {error}
          </div>
        ) : null}
        <InBrowserCamera
          title="Positionen fotografieren"
          hint="Schritt 3 von 3 · Tabellenblock"
          guideFrame="section"
          guideSectionAnchor="center"
          guideLabel="Alle Positionen / Tabellenzeilen im Rahmen"
          onCapture={handleLineItemsCapture}
          onClose={() =>
            setState((prev) => ({ ...prev, phase: "capture-header" }))
          }
        />
      </>
    );
  }

  if (phase === "analyzing") {
    return (
      <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col items-center justify-center gap-8 px-4 py-6 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-neutral-100 border-t-neutral-900" />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900">
            <ScanLine className="h-7 w-7 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[1rem] font-semibold text-[color:var(--vd-text)]">
            Rechnung wird analysiert…
          </p>
          <p className="text-[0.82rem] text-[color:var(--vd-muted)]">
            Kopf · Positionen · Gesamtbetrag — direkt ans LLM
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {["Übersicht", "Kopf", "Positionen"].map((label) => (
            <div
              key={label}
              className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1"
            >
              <LoaderCircle className="h-3 w-3 animate-spin text-neutral-500" />
              <span className="text-[0.68rem] font-medium text-neutral-600">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const captureStepMap: Partial<Record<WizardPhase, number>> = {
    "capture-overview": 1,
    "capture-header": 2,
    "capture-line-items": 3,
  };
  const showCurrentStep = captureStepMap[phase] ?? 3;

  return (
    <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-4 px-4 py-6">
      <header className="space-y-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </button>
        ) : backHref ? (
          <PressableLink
            href={backHref}
            variant="pill"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </PressableLink>
        ) : null}

        <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            {scanDef.title} · Review
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.35rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            {resolvedHeading}
          </h1>
          <p className="mt-1 text-[0.85rem] text-[color:var(--vd-muted)]">
            {vehicleLabel}
          </p>
          <div className="mt-4">
            <WizardProgress currentStep={showCurrentStep} totalSteps={3} />
          </div>
        </div>
      </header>

      {fields && previewUrl && uploadFile ? (
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="space-y-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white p-4 shadow-[var(--vd-shadow-sm)]">
            <Label>
              <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                Titel
              </span>
              <Input
                value={title}
                onChange={(event) =>
                  setState((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </Label>

            <ReviewRow label="Werkstatt" value={fields.vendor} />
            <ReviewRow label="Belegnr." value={fields.invoiceNumber} />
            <ReviewRow
              label="KM-Stand"
              value={
                fields.mileageKm === null ? null : `${fields.mileageKm} km`
              }
            />

            <Label>
              <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                Kategorie
              </span>
              {scanDef.lockCategory ? (
                <p className="mt-1 text-[0.9rem] font-medium text-[color:var(--vd-text)]">
                  {CATEGORY_LABELS[fields.category]}
                </p>
              ) : (
                <select
                  value={fields.category}
                  onChange={(event) =>
                    setState((prev) =>
                      prev.fields
                        ? {
                            ...prev,
                            fields: {
                              ...prev.fields,
                              category: event.target
                                .value as InvoiceTextParseCategory,
                            },
                          }
                        : prev,
                    )
                  }
                  className="claim-input mt-1"
                >
                  {INVOICE_TEXT_PARSE_CATEGORIES.filter((c) => c !== "abe").map(
                    (option) => (
                      <option key={option} value={option}>
                        {CATEGORY_LABELS[option]}
                      </option>
                    ),
                  )}
                </select>
              )}
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <Label>
                <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                  Betrag (€)
                </span>
                <Input
                  inputMode="decimal"
                  value={
                    fields.amount === null || fields.amount === undefined
                      ? ""
                      : String(fields.amount)
                  }
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    if (!raw) {
                      setState((prev) =>
                        prev.fields
                          ? {
                              ...prev,
                              fields: { ...prev.fields, amount: null },
                            }
                          : prev,
                      );
                      return;
                    }
                    const value = Number.parseFloat(raw.replace(",", "."));
                    if (!Number.isFinite(value)) return;
                    setState((prev) =>
                      prev.fields
                        ? {
                            ...prev,
                            fields: { ...prev.fields, amount: value },
                          }
                        : prev,
                    );
                  }}
                />
              </Label>
              <Label>
                <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                  Datum
                </span>
                <Input
                  type="date"
                  value={fields.date ?? ""}
                  onChange={(event) =>
                    setState((prev) =>
                      prev.fields
                        ? {
                            ...prev,
                            fields: {
                              ...prev.fields,
                              date: event.target.value || null,
                            },
                          }
                        : prev,
                    )
                  }
                />
              </Label>
            </div>

            <EditableLineItemsSection
              items={fields.lineItems ?? []}
              totalAmount={fields.amount}
              emptyHint="Keine Positionen erkannt — Positionen-Scan wiederholen oder manuell ergänzen."
              onChange={(lineItems) =>
                setState((prev) =>
                  prev.fields
                    ? {
                        ...prev,
                        fields: {
                          ...prev.fields,
                          lineItems: lineItems.length ? lineItems : null,
                        },
                      }
                    : prev,
                )
              }
            />
          </div>

          <div className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white shadow-[var(--vd-shadow-sm)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Dokumentvorschau"
              className="max-h-[36vh] w-full bg-neutral-100 object-contain"
            />
            <div className="flex items-center justify-between gap-3 border-t border-[color:var(--vd-border)] px-3 py-2.5 text-[0.75rem] text-[color:var(--vd-muted)]">
              <span>{formatBytes(uploadFile.size)}</span>
              <button
                type="button"
                onClick={resetWizard}
                className="inline-flex items-center gap-1 font-medium text-[color:var(--vd-text)]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Neu scannen
              </button>
            </div>
          </div>

          {saveError ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
            >
              {saveError}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="claim-cta">
            {pending ? "Wird gespeichert…" : "Speichern"}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
