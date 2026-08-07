"use client";

import { useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileImage,
  LoaderCircle,
  RotateCcw,
  ScanLine,
} from "lucide-react";

import { InBrowserCamera } from "@/components/documents/in-browser-camera";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { convertImagesToPdf } from "@/lib/utils/pdf-converter";
import { localDateIso } from "@/lib/documents/format";
import { uploadDocument } from "@/lib/documents/upload-document";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import {
  mergeAbeWizardSteps,
  type AbeWizardCoverExtraction,
  type AbeWizardMainExtraction,
  type AbeWizardReport,
  type AbeWizardVehiclesExtraction,
} from "@/lib/validations/abeWizardSchemas";

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardPhase =
  | "capture-cover"       // Step 1/3: photograph Deckblatt
  | "capture-main"        // Step 2/3: photograph ABE Hauptseite
  | "capture-vehicles"    // Step 3/3: photograph Fahrzeug- & Auflagen-Tabelle
  | "analyzing"           // All 3 LLM calls fire in parallel here
  | "review";             // User confirms extracted data + saves

interface WizardState {
  phase: WizardPhase;
  coverFile: File | null;
  mainFile: File | null;
  vehiclesFile: File | null;
  coverExtraction: AbeWizardCoverExtraction | null;
  mainExtraction: AbeWizardMainExtraction | null;
  vehiclesExtraction: AbeWizardVehiclesExtraction | null;
  report: AbeWizardReport | null;
  uploadFile: File | null;
  error: string | null;
}

export interface AbeUploadWizardProps {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
  successHref?: string;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
}

// ─── Capture step definitions ─────────────────────────────────────────────────

const CAPTURE_STEPS: Array<{
  phase: Extract<WizardPhase, `capture-${string}`>;
  stepNumber: number;
  title: string;
  hint: string;
  guideLabel: string;
}> = [
  {
    phase: "capture-cover",
    stepNumber: 1,
    title: "Deckblatt fotografieren",
    hint: "Lade das Deckblatt hoch (Hier stehen KBA-Nummer, Design & Technische Daten wie 8J x 18 ET30).",
    guideLabel: "Deckblatt im DIN-A4-Rahmen ausrichten",
  },
  {
    phase: "capture-main",
    stepNumber: 2,
    title: "ABE-Hauptseite fotografieren",
    hint: "Lade die ABE-Hauptseite hoch (Hier stehen die ABE-Nummer und der Hersteller wie Alcar).",
    guideLabel: "ABE-Hauptseite im DIN-A4-Rahmen ausrichten",
  },
  {
    phase: "capture-vehicles",
    stepNumber: 3,
    title: "Fahrzeug- & Auflagen-Tabelle fotografieren",
    hint: "Lade genau die Seite hoch, auf der dein Fahrzeug (z.B. BMW 5er Touring) und deine Reifengröße aufgelistet sind.",
    guideLabel: "Fahrzeugtabelle im DIN-A4-Rahmen ausrichten",
  },
];

// ─── API helpers ──────────────────────────────────────────────────────────────

class AbeApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AbeApiError";
  }
}

async function callAbeStep<T>(file: File, step: string, label: string): Promise<T> {
  const body = new FormData();
  body.set("file", file);
  body.set("step", step);

  const response = await fetch("/api/ocr/abe", { method: "POST", body });
  const payload = (await response.json().catch(() => null)) as
    | { ok: true; extraction: T }
    | { ok: false; error?: string }
    | null;

  if (!response.ok || !payload || payload.ok !== true) {
    throw new AbeApiError(
      payload && "error" in payload && payload.error
        ? payload.error
        : `${label} fehlgeschlagen (${response.status}).`,
    );
  }
  return (payload as { ok: true; extraction: T }).extraction;
}

const fetchCoverExtraction = (f: File) =>
  callAbeStep<AbeWizardCoverExtraction>(f, "cover", "Deckblatt-Analyse");

const fetchMainExtraction = (f: File) =>
  callAbeStep<AbeWizardMainExtraction>(f, "main", "Hauptseite-Analyse");

const fetchVehiclesExtraction = (f: File) =>
  callAbeStep<AbeWizardVehiclesExtraction>(f, "vehicles", "Fahrzeugtabellen-Analyse");

// ─── Build upload file ────────────────────────────────────────────────────────

async function buildUploadFile(
  coverFile: File | null,
  mainFile: File | null,
  vehiclesFile: File | null,
): Promise<File | null> {
  const pages = [coverFile, mainFile, vehiclesFile].filter(
    (f): f is File => f !== null,
  );
  if (pages.length === 0) return null;
  if (pages.length === 1 && pages[0]!.type === "application/pdf") return pages[0]!;

  try {
    const result = await convertImagesToPdf(pages, {
      fileName: `abe-scan-${Date.now()}`,
      fullBleed: true,
      imageCompression: "MEDIUM",
    });
    return result.file;
  } catch {
    return pages[0]!;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WizardProgress({
  currentStep,
  totalSteps = 3,
}: {
  currentStep: number;
  totalSteps?: number;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const done = step < currentStep;
        const active = step === currentStep;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={[
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                done
                  ? "bg-green-600 text-white"
                  : active
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400",
              ].join(" ")}
            >
              {done ? <CheckCircle2 className="h-4 w-4" /> : step}
            </div>
            {i < totalSteps - 1 && (
              <div
                className={[
                  "h-px w-8 transition-colors",
                  done ? "bg-green-600" : "bg-zinc-200 dark:bg-zinc-700",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CapturePreview({ file, label }: { file: File; label: string }) {
  const url = URL.createObjectURL(file);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900 dark:bg-green-950/40">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
      <span className="truncate text-sm font-medium text-green-800 dark:text-green-300">
        {label}: {file.name}
      </span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto shrink-0 text-xs text-green-700 underline dark:text-green-400"
        onClick={() => setTimeout(() => URL.revokeObjectURL(url), 5000)}
      >
        Vorschau
      </a>
    </div>
  );
}

// ─── Review form ──────────────────────────────────────────────────────────────

interface ReviewFormState {
  kbaNumber: string;
  abeNumber: string;
  manufacturer: string;
  testingOrganization: string;
  designType: string;
  dimensions: string;
  articleNumbers: string;
}

function reportToFormState(report: AbeWizardReport): ReviewFormState {
  return {
    kbaNumber: report.kbaNumber ?? "",
    abeNumber: report.abeNumber ?? "",
    manufacturer: report.manufacturer ?? "",
    testingOrganization: report.testingOrganization ?? "",
    designType: report.designType ?? "",
    dimensions: report.dimensions ?? "",
    articleNumbers: report.articleNumbers.join(", "),
  };
}

function ReviewForm({
  report,
  onSave,
  isSaving,
  saveError,
}: {
  report: AbeWizardReport;
  onSave: (form: ReviewFormState) => void;
  isSaving: boolean;
  saveError: string | null;
}) {
  const [form, setForm] = useState<ReviewFormState>(() =>
    reportToFormState(report),
  );

  const set = (key: keyof ReviewFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
          ABE-Daten bestätigen
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Prüfe die extrahierten Felder und korrigiere sie bei Bedarf.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kbaNumber">KBA-Nummer</Label>
          <Input
            id="kbaNumber"
            value={form.kbaNumber}
            onChange={set("kbaNumber")}
            placeholder="z.B. 48185"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="abeNumber">ABE-Nummer</Label>
          <Input
            id="abeNumber"
            value={form.abeNumber}
            onChange={set("abeNumber")}
            placeholder="z.B. 48185*08"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manufacturer">Hersteller</Label>
          <Input
            id="manufacturer"
            value={form.manufacturer}
            onChange={set("manufacturer")}
            placeholder="z.B. Alcar Leichtmetallräder GmbH"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="testingOrganization">Prüforganisation</Label>
          <Input
            id="testingOrganization"
            value={form.testingOrganization}
            onChange={set("testingOrganization")}
            placeholder="z.B. Kraftfahrt-Bundesamt"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="designType">Design</Label>
          <Input
            id="designType"
            value={form.designType}
            onChange={set("designType")}
            placeholder="z.B. Valencia / Valencia dark"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dimensions">Maße</Label>
          <Input
            id="dimensions"
            value={form.dimensions}
            onChange={set("dimensions")}
            placeholder="z.B. 8J x 18H2 LK 5x120 ET 30"
          />
        </div>
        <div className="col-span-full flex flex-col gap-1.5">
          <Label htmlFor="articleNumbers">Artikel-Nummern</Label>
          <Input
            id="articleNumbers"
            value={form.articleNumbers}
            onChange={set("articleNumbers")}
            placeholder="z.B. AVAG9HA30, AVAG9BP30"
          />
        </div>
      </div>

      {report.vehicleMatches.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Fahrzeugfreigaben ({report.vehicleMatches.length})
          </p>
          <div className="flex flex-col gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            {report.vehicleMatches.map((match, i) => (
              <div key={i} className="text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-medium text-zinc-900 dark:text-white">
                  {match.model}
                </span>
                {match.driveType && (
                  <span className="ml-1 text-zinc-500">· {match.driveType}</span>
                )}
                {match.tireSizes.length > 0 && (
                  <span className="ml-1">· {match.tireSizes.join(", ")}</span>
                )}
                {match.auflagenCodes.length > 0 && (
                  <span className="ml-1 text-zinc-400">
                    [{match.auflagenCodes.join(", ")}]
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {saveError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {saveError}
        </p>
      )}

      <Button
        onClick={() => onSave(form)}
        disabled={isSaving}
        className="w-full"
      >
        {isSaving ? (
          <>
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            Wird gespeichert…
          </>
        ) : (
          "ABE speichern"
        )}
      </Button>
    </div>
  );
}

// ─── Main wizard component ────────────────────────────────────────────────────

export function AbeUploadWizard({
  vehicleId,
  tagUuid,
  vehicleLabel,
  successHref,
  onBack,
  backHref,
  backLabel = "Zurück",
}: AbeUploadWizardProps) {
  const [state, setState] = useState<WizardState>({
    phase: "capture-cover",
    coverFile: null,
    mainFile: null,
    vehiclesFile: null,
    coverExtraction: null,
    mainExtraction: null,
    vehiclesExtraction: null,
    report: null,
    uploadFile: null,
    error: null,
  });

  const [saveError, setSaveError] = useState<string | null>(null);
  const [, startSaveTransition] = useTransition();

  const previewUrlRef = useRef<string | null>(null);

  // ── Capture handlers ─────────────────────────────────────────────────────────

  function handleCoverCapture(file: File) {
    setState((prev) => ({
      ...prev,
      coverFile: file,
      phase: "capture-main",
      error: null,
    }));
  }

  function handleMainCapture(file: File) {
    setState((prev) => ({
      ...prev,
      mainFile: file,
      phase: "capture-vehicles",
      error: null,
    }));
  }

  function handleVehiclesCapture(file: File) {
    setState((prev) => ({ ...prev, vehiclesFile: file, phase: "analyzing", error: null }));
    runAnalysis(state.coverFile!, file, state.mainFile);
  }

  // ── Analysis ─────────────────────────────────────────────────────────────────

  async function runAnalysis(
    coverFile: File,
    vehiclesFile: File,
    mainFile: File | null,
  ) {
    try {
      const [coverResult, mainResult, vehiclesResult, uploadFile] =
        await Promise.all([
          fetchCoverExtraction(coverFile),
          mainFile ? fetchMainExtraction(mainFile) : Promise.resolve(null),
          fetchVehiclesExtraction(vehiclesFile),
          buildUploadFile(coverFile, mainFile, vehiclesFile),
        ]);

      const report = mergeAbeWizardSteps(coverResult, mainResult, vehiclesResult);

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      setState((prev) => ({
        ...prev,
        phase: "review",
        coverExtraction: coverResult,
        mainExtraction: mainResult,
        vehiclesExtraction: vehiclesResult,
        report,
        uploadFile,
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        phase: "capture-vehicles",
        error:
          err instanceof Error
            ? err.message
            : "Analyse fehlgeschlagen. Bitte erneut versuchen.",
      }));
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  function handleSave(form: ReviewFormState) {
    if (!state.uploadFile) {
      setSaveError("Keine Datei zum Speichern vorhanden.");
      return;
    }
    if (!state.report) {
      setSaveError("Keine Extraktionsdaten vorhanden.");
      return;
    }

    setSaveError(null);

    const kbaDisplay = form.kbaNumber.trim()
      ? `KBA ${form.kbaNumber.trim()}`
      : null;
    const titleParts = [
      form.manufacturer.trim() || "ABE",
      form.designType.trim(),
      form.dimensions.trim(),
    ].filter(Boolean);
    const title = titleParts.join(" · ") || "ABE";

    const articleList = form.articleNumbers
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const vehicleApprovals = state.report.vehicleMatches.map(
      (m) =>
        `${m.model}${m.driveType ? ` (${m.driveType})` : ""}${m.tireSizes.length ? ` – ${m.tireSizes.join(", ")}` : ""}`,
    );

    const allAuflagen = Array.from(
      new Set(
        state.report.vehicleMatches.flatMap((m) => m.auflagenCodes),
      ),
    );

    const technicalSpecs = [
      form.abeNumber.trim()
        ? { label: "ABE-Nummer", value: form.abeNumber.trim() }
        : null,
      form.designType.trim()
        ? { label: "Design", value: form.designType.trim() }
        : null,
      form.dimensions.trim()
        ? { label: "Maße", value: form.dimensions.trim() }
        : null,
      articleList.length > 0
        ? { label: "Artikel-Nr.", value: articleList.join(", ") }
        : null,
    ].filter((item): item is { label: string; value: string } => item !== null);

    const pageCount = [state.coverFile, state.mainFile, state.vehiclesFile].filter(
      Boolean,
    ).length;

    startSaveTransition(async () => {
      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("title", title);
      formData.set("type", "abe");
      formData.set("category", "abe");
      formData.set("vendor", form.manufacturer.trim() || "");
      formData.set("date", localDateIso());
      formData.set("amount", "");
      formData.set("lineItems", "");
      formData.set("kbaNumber", form.kbaNumber.trim());
      formData.set("vehicleApprovals", JSON.stringify(vehicleApprovals));
      formData.set("authority", form.testingOrganization.trim());
      formData.set("conditions", JSON.stringify(allAuflagen));
      formData.set("technicalSpecs", JSON.stringify(technicalSpecs));
      formData.set("partCategory", kbaDisplay ?? "");
      formData.set("notes", "");
      formData.set("manufacturer", form.manufacturer.trim());
      formData.set("invoiceNumber", form.abeNumber.trim());
      formData.set("mileageKm", "");
      formData.set("pageCount", String(pageCount || 1));
      formData.set("approvalFields", JSON.stringify({ kind: "abe" }));
      formData.set("file", state.uploadFile!);

      const result = await uploadDocument(formData);
      if (result.status === "error") {
        setSaveError(result.message);
        return;
      }

      if (successHref) {
        window.location.href = successHref;
      } else if (result.tagUuid) {
        window.location.href = `/v/${result.tagUuid}/dokumente?type=abe`;
      }
    });
  }

  // ── Back navigation ───────────────────────────────────────────────────────────

  function goBack() {
    if (onBack) {
      onBack();
    } else if (backHref) {
      window.location.href = backHref;
    }
  }

  // ── Camera close / step back ──────────────────────────────────────────────────

  function handleCameraClose() {
    goBack();
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const currentCaptureStep = CAPTURE_STEPS.find((s) => s.phase === state.phase);

  // Camera capture phases
  if (currentCaptureStep) {
    const { stepNumber, title, hint, guideLabel, phase } = currentCaptureStep;

    return (
      <div className="flex min-h-screen flex-col bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3">
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </button>
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-white">{title}</span>
            <span className="text-xs text-zinc-500">{vehicleLabel}</span>
          </div>
          <div className="w-16" />
        </div>

        {/* Progress */}
        <div className="flex justify-center border-b border-zinc-800 bg-zinc-900">
          <WizardProgress currentStep={stepNumber} />
        </div>

        {/* Hint banner */}
        <div className="border-b border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-center">
          <p className="text-xs text-zinc-400">{hint}</p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
            <ScanLine className="h-3 w-3" />
            Schritt {stepNumber} von 3 · genauer
          </span>
        </div>

        {/* Error */}
        {state.error && (
          <div className="mx-4 mt-3 rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-300">
            {state.error}
          </div>
        )}

        {/* Captured pages summary (shows previously captured images) */}
        {(state.coverFile || state.mainFile) && (
          <div className="flex flex-col gap-1.5 bg-zinc-900 px-4 py-2">
            {state.coverFile && phase !== "capture-cover" && (
              <CapturePreview file={state.coverFile} label="Deckblatt" />
            )}
            {state.mainFile && phase === "capture-vehicles" && (
              <CapturePreview file={state.mainFile} label="Hauptseite" />
            )}
          </div>
        )}

        {/* Camera */}
        <div className="flex-1">
          <InBrowserCamera
            title={title}
            hint={hint}
            guideLabel={guideLabel}
            guideFrame="a4"
            allowPdf={false}
            onCapture={
              phase === "capture-cover"
                ? handleCoverCapture
                : phase === "capture-main"
                  ? handleMainCapture
                  : handleVehiclesCapture
            }
            onClose={handleCameraClose}
          />
        </div>
      </div>
    );
  }

  // Analyzing phase
  if (state.phase === "analyzing") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 px-4">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="h-10 w-10 animate-spin text-zinc-300" />
          <p className="text-lg font-semibold text-white">ABE wird analysiert…</p>
          <p className="max-w-xs text-center text-sm text-zinc-400">
            KBA-Nummer, Maße, Hersteller und Fahrzeugfreigaben werden ausgelesen.
          </p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-2">
          {state.coverFile && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <FileImage className="h-3.5 w-3.5" />
              <span>Deckblatt · {state.coverFile.name}</span>
            </div>
          )}
          {state.mainFile && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <FileImage className="h-3.5 w-3.5" />
              <span>Hauptseite · {state.mainFile.name}</span>
            </div>
          )}
          {state.vehiclesFile && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <FileImage className="h-3.5 w-3.5" />
              <span>Fahrzeugtabelle · {state.vehiclesFile.name}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Review phase
  if (state.phase === "review" && state.report) {
    return (
      <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            onClick={() =>
              setState((prev) => ({
                ...prev,
                phase: "capture-cover",
                coverFile: null,
                mainFile: null,
                vehiclesFile: null,
                report: null,
                uploadFile: null,
                error: null,
              }))
            }
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
            Neu scannen
          </button>
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-zinc-900 dark:text-white">
              ABE prüfen
            </span>
            <span className="text-xs text-zinc-500">{vehicleLabel}</span>
          </div>
          <div className="w-20" />
        </div>

        {/* Progress */}
        <div className="flex justify-center border-b border-zinc-200 dark:border-zinc-800">
          <WizardProgress currentStep={4} />
        </div>

        {/* Captured thumbnails row */}
        <div className="flex gap-2 overflow-x-auto bg-zinc-50 px-4 py-3 dark:bg-zinc-900/50">
          {[
            { file: state.coverFile, label: "Deckblatt" },
            { file: state.mainFile, label: "Hauptseite" },
            { file: state.vehiclesFile, label: "Fahrzeugtabelle" },
          ]
            .filter((item): item is { file: File; label: string } => item.file !== null)
            .map(({ file, label }) => (
              <div key={label} className="flex shrink-0 flex-col items-center gap-1">
                <div className="h-16 w-12 overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={label}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="text-xs text-zinc-500">{label}</span>
              </div>
            ))}
        </div>

        {/* Review form */}
        <div className="flex-1 overflow-auto">
          <ReviewForm
            report={state.report}
            onSave={handleSave}
            isSaving={false}
            saveError={saveError}
          />
        </div>
      </div>
    );
  }

  return null;
}
