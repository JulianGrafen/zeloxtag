"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  LoaderCircle,
  Pencil,
  RotateCcw,
  ScanLine,
} from "lucide-react";

import {
  AbeFieldLabel,
  AbeKbaHero,
  AbeSummaryRow,
} from "@/components/documents/abe-review-ui";
import { AbeVehicleMatchPicker } from "@/components/documents/abe-vehicle-match-picker";
import { InBrowserCamera } from "@/components/documents/in-browser-camera";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { convertImagesToPdf } from "@/lib/utils/pdf-converter";
import { localDateIso } from "@/lib/documents/format";
import {
  auflagenForAbeVehicleMatch,
  formatAbeVehicleApprovalLine,
  resolveInitialAbeVehicleMatchIndex,
  selectedVehicleMatchPayload,
} from "@/lib/ocr/abe-wizard-vehicle-match";
import { uploadDocument } from "@/lib/documents/upload-document";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import type { AbeVehicleContext } from "@/lib/validations/abeSchema";
import {
  mergeAbeWizardSteps,
  type AbeWizardCoverExtraction,
  type AbeWizardMainExtraction,
  type AbeWizardReport,
  type AbeWizardVehiclesExtraction,
} from "@/lib/validations/abeWizardSchemas";

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardPhase =
  | "capture-cover"
  | "capture-main"
  | "capture-vehicles"
  | "analyzing"
  | "review";

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
  vehicleContext?: AbeVehicleContext | null;
  successHref?: string;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
}

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
    title: "Erste Seite",
    hint: "Scanne die erste Seite. Dort wo die KBA-Nummer, Design und Modell-Typ stehen.",
    guideLabel: "KBA-Nummer · Design · Modell-Typ",
  },
  {
    phase: "capture-main",
    stepNumber: 2,
    title: "ABE-Deckblatt",
    hint: "Scanne das Deckblatt der ABE. Die Seite, auf der Kraftfahrt-Bundesamt steht mit der Überschrift Allgemeine Betriebserlaubnis.",
    guideLabel: "Kraftfahrt-Bundesamt · Allgemeine Betriebserlaubnis",
  },
  {
    phase: "capture-vehicles",
    stepNumber: 3,
    title: "Fahrzeugtabelle",
    hint: "Suche in der Tabelle dein Fahrzeug heraus und scanne diesen Abschnitt.",
    guideLabel: "Deine Fahrzeugzeile im Rahmen ausrichten",
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
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={[
            "h-1.5 flex-1 rounded-full transition-colors duration-300",
            i < currentStep ? "bg-neutral-900" : "bg-neutral-200",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

function WizardBackButton({
  onBack,
  backHref,
  backLabel,
}: {
  onBack?: () => void;
  backHref?: string;
  backLabel: string;
}) {
  if (onBack) {
    return (
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </button>
    );
  }
  if (backHref) {
    return (
      <PressableLink
        href={backHref}
        variant="pill"
        className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </PressableLink>
    );
  }
  return null;
}

interface ReviewFormState {
  kbaNumber: string;
  abeNumber: string;
  abeHolder: string;
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
    abeHolder: report.abeHolder ?? "",
    manufacturer: report.manufacturer ?? "",
    testingOrganization: report.testingOrganization ?? "",
    designType: report.designType ?? "",
    dimensions: report.dimensions ?? "",
    articleNumbers: report.articleNumbers.join(", "),
  };
}

interface ReviewSavePayload {
  form: ReviewFormState;
  selectedMatchIndex: number | null;
}

function ReviewSection({
  report,
  previewUrl,
  pageCount,
  vehicleLabel,
  vehicleContext,
  onSave,
  onRescan,
  isSaving,
  saveError,
}: {
  report: AbeWizardReport;
  previewUrl: string | null;
  pageCount: number;
  vehicleLabel: string;
  vehicleContext?: AbeVehicleContext | null;
  onSave: (payload: ReviewSavePayload) => void;
  onRescan: () => void;
  isSaving: boolean;
  saveError: string | null;
}) {
  const [form, setForm] = useState<ReviewFormState>(() =>
    reportToFormState(report),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number | null>(
    () => resolveInitialAbeVehicleMatchIndex(report.vehicleMatches, vehicleContext),
  );
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const set =
    (key: keyof ReviewFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="vd-anim-header flex flex-col gap-4">
      {report.vehicleMatches.length > 0 ? (
        <AbeVehicleMatchPicker
          matches={report.vehicleMatches}
          selectedIndex={selectedMatchIndex}
          onSelect={(index) => {
            setSelectedMatchIndex(index);
            setSelectionError(null);
          }}
          vehicleContext={vehicleContext}
          vehicleLabel={vehicleLabel}
          selectionError={selectionError}
        />
      ) : (
        <section className="rounded-[1.35rem] border border-amber-300/70 bg-amber-50 px-4 py-4 text-[0.88rem] leading-relaxed text-amber-950 shadow-[var(--vd-shadow-sm)]">
          <p className="font-semibold">Keine Fahrzeugtabelle erkannt</p>
          <p className="mt-1">
            Scanne in Schritt 3 die Seite mit der Fahrzeug- und Auflagen-Tabelle
            erneut — ohne diese Zeilen kann kein Fahrzeug zugeordnet werden.
          </p>
        </section>
      )}

      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow)] sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
              Summary
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-[1.2rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
              ABE Kern­daten
            </h2>
            <p className="mt-1 text-[0.78rem] text-[color:var(--vd-muted)]">
              {vehicleLabel
                ? `Geführter Scan · ${vehicleLabel}`
                : `Geführter Scan · ${pageCount} ${pageCount === 1 ? "Seite" : "Seiten"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-1.5 text-[0.72rem] font-medium text-[color:var(--vd-text)]"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            {isEditing ? "Ansicht" : "Bearbeiten"}
          </button>
        </header>

        <div className="mt-4 space-y-4">
          <AbeKbaHero
            value={form.kbaNumber}
            isEditing={isEditing}
            onChange={set("kbaNumber")}
          />

          {isEditing ? (
            <div className="space-y-3">
              <AbeFieldLabel label="ABE-Nummer">
                <Input
                  value={form.abeNumber}
                  onChange={set("abeNumber")}
                  placeholder="ABE-Nummer"
                />
              </AbeFieldLabel>
              <AbeFieldLabel label="Inhaber der ABE">
                <Input
                  value={form.abeHolder}
                  onChange={set("abeHolder")}
                  placeholder="Inhaber laut Dokument"
                />
              </AbeFieldLabel>
              <AbeFieldLabel label="Hersteller">
                <Input
                  value={form.manufacturer}
                  onChange={set("manufacturer")}
                  placeholder="Hersteller laut Dokument"
                />
              </AbeFieldLabel>
              <AbeFieldLabel label="Prüforganisation">
                <Input
                  value={form.testingOrganization}
                  onChange={set("testingOrganization")}
                  placeholder="Prüforganisation laut Dokument"
                />
              </AbeFieldLabel>
              <AbeFieldLabel label="Design">
                <Input
                  value={form.designType}
                  onChange={set("designType")}
                  placeholder="Design laut Deckblatt"
                />
              </AbeFieldLabel>
              <AbeFieldLabel label="Maße">
                <Input
                  value={form.dimensions}
                  onChange={set("dimensions")}
                  placeholder="Maße laut Deckblatt"
                />
              </AbeFieldLabel>
              <AbeFieldLabel label="Artikel-Nummern">
                <Input
                  value={form.articleNumbers}
                  onChange={set("articleNumbers")}
                  placeholder="Artikelnummern, kommagetrennt"
                />
              </AbeFieldLabel>
            </div>
          ) : (
            <dl className="grid gap-2.5 text-[0.88rem]">
              <AbeSummaryRow label="ABE-Nummer" value={form.abeNumber} />
              <AbeSummaryRow label="Inhaber der ABE" value={form.abeHolder} />
              <AbeSummaryRow label="Hersteller" value={form.manufacturer} />
              <AbeSummaryRow
                label="Prüforganisation"
                value={form.testingOrganization}
              />
              <AbeSummaryRow label="Design" value={form.designType} />
              <AbeSummaryRow label="Maße" value={form.dimensions} />
              <AbeSummaryRow label="Artikel-Nr." value={form.articleNumbers} />
            </dl>
          )}

        </div>

        {saveError ? (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-[0.78rem] text-amber-950"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{saveError}</span>
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <Button
            type="button"
            disabled={isSaving}
            onClick={() => {
              if (report.vehicleMatches.length === 0) {
                setSelectionError(null);
                onSave({ form, selectedMatchIndex: null });
                return;
              }
              if (selectedMatchIndex === null) {
                setSelectionError(
                  "Bitte wähle dein Fahrzeug aus der Fahrzeugtabelle.",
                );
                return;
              }
              setSelectionError(null);
              onSave({ form, selectedMatchIndex });
            }}
          >
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                Speichern…
              </span>
            ) : (
              "ABE speichern"
            )}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={onRescan}
            >
              <RotateCcw className="h-4 w-4" />
              Neu scannen
            </Button>
            <span />
          </div>
        </div>
      </section>

      {previewUrl ? (
        <section className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)]">
          <div className="flex items-center justify-between gap-2 border-b border-[color:var(--vd-border)] px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2 text-[0.78rem] text-[color:var(--vd-muted)]">
              <FileText className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">
                Dokumentvorschau · {pageCount}{" "}
                {pageCount === 1 ? "Seite" : "Seiten"}
              </span>
            </div>
          </div>
          <div className="max-h-[min(62vh,560px)] min-h-[240px] overflow-auto bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="ABE Scan Vorschau"
              className="mx-auto w-full max-w-full object-contain"
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export function AbeUploadWizard({
  vehicleId,
  tagUuid,
  vehicleLabel,
  vehicleContext = null,
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
  const [isSaving, startSaveTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const pageCount = useMemo(
    () =>
      [state.coverFile, state.mainFile, state.vehiclesFile].filter(Boolean)
        .length,
    [state.coverFile, state.mainFile, state.vehiclesFile],
  );

  useEffect(() => {
    const source = state.coverFile ?? state.mainFile ?? state.vehiclesFile;
    if (!source) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(source);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [state.coverFile, state.mainFile, state.vehiclesFile]);

  function goBack() {
    if (onBack) onBack();
    else if (backHref) window.location.href = backHref;
  }

  function resetWizard() {
    setState({
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
    setSaveError(null);
  }

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
    setState((prev) => {
      void runAnalysis(prev.coverFile!, file, prev.mainFile);
      return {
        ...prev,
        vehiclesFile: file,
        phase: "analyzing",
        error: null,
      };
    });
  }

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

  function handleSave({ form, selectedMatchIndex }: ReviewSavePayload) {
    if (!state.uploadFile || !state.report) {
      setSaveError("Keine Datei zum Speichern vorhanden.");
      return;
    }

    if (
      state.report.vehicleMatches.length > 0 &&
      selectedMatchIndex === null
    ) {
      setSaveError("Bitte wähle dein Fahrzeug aus der Fahrzeugtabelle.");
      return;
    }

    setSaveError(null);

    const selectedMatch =
      selectedMatchIndex !== null
        ? state.report.vehicleMatches[selectedMatchIndex] ?? null
        : null;

    const kbaDisplay = form.kbaNumber.trim()
      ? `KBA ${form.kbaNumber.trim()}`
      : null;
    const titleParts = [
      form.manufacturer.trim() || form.abeHolder.trim() || "ABE",
      form.designType.trim(),
      form.dimensions.trim(),
    ].filter(Boolean);
    const title = titleParts.join(" · ") || "ABE";

    const articleList = form.articleNumbers
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const vehicleApprovals = selectedMatch
      ? [formatAbeVehicleApprovalLine(selectedMatch)]
      : [];
    const filteredAuflagen = auflagenForAbeVehicleMatch(selectedMatch);

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

    startSaveTransition(async () => {
      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("title", title);
      formData.set("type", "abe");
      formData.set("category", "abe");
      formData.set("vendor", form.designType.trim() || "");
      formData.set("date", localDateIso());
      formData.set("amount", "");
      formData.set("lineItems", "");
      formData.set("kbaNumber", form.kbaNumber.trim());
      formData.set("vehicleApprovals", JSON.stringify(vehicleApprovals));
      formData.set("authority", form.testingOrganization.trim());
      formData.set("conditions", JSON.stringify(filteredAuflagen));
      formData.set("technicalSpecs", JSON.stringify(technicalSpecs));
      formData.set("partCategory", kbaDisplay ?? "");
      formData.set("notes", "");
      formData.set("manufacturer", form.manufacturer.trim());
      formData.set("invoiceNumber", form.abeNumber.trim());
      formData.set("mileageKm", "");
      formData.set("pageCount", String(pageCount || 1));
      formData.set(
        "approvalFields",
        JSON.stringify({
          kind: "abe",
          data: {
            abeHolder: form.abeHolder.trim() || null,
            selectedVehicleMatch: selectedMatch
              ? selectedVehicleMatchPayload(selectedMatch)
              : null,
          },
        }),
      );
      formData.set("file", state.uploadFile!);

      const result = await uploadDocument(formData);
      if (result.status === "error") {
        setSaveError(result.message);
        return;
      }

      if (successHref) window.location.href = successHref;
      else if (result.tagUuid) {
        window.location.href = `/v/${result.tagUuid}/dokumente?type=abe`;
      }
    });
  }

  const currentCaptureStep = CAPTURE_STEPS.find((s) => s.phase === state.phase);

  if (currentCaptureStep) {
    const { title, hint, guideLabel, phase, stepNumber } = currentCaptureStep;

    return (
      <>
        {state.error ? (
          <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.82rem] text-red-800 shadow-lg">
            {state.error}
          </div>
        ) : null}
        <InBrowserCamera
          title={title}
          hint={hint}
          guideLabel={guideLabel}
          guideFrame="a4"
          allowPdf={false}
          showBriefing={false}
          continuousCapture
          captureStep={{ current: stepNumber, total: CAPTURE_STEPS.length }}
          onCapture={
            phase === "capture-cover"
              ? handleCoverCapture
              : phase === "capture-main"
                ? handleMainCapture
                : handleVehiclesCapture
          }
          onClose={() => {
            if (phase === "capture-cover") goBack();
            else if (phase === "capture-main") {
              setState((prev) => ({ ...prev, phase: "capture-cover" }));
            } else {
              setState((prev) => ({ ...prev, phase: "capture-main" }));
            }
          }}
        />
      </>
    );
  }

  if (state.phase === "analyzing") {
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
            ABE wird analysiert…
          </p>
          <p className="text-[0.82rem] text-[color:var(--vd-muted)]">
            KBA · Maße · Hersteller · Fahrzeugfreigaben
          </p>
          <p className="text-[0.78rem] text-[color:var(--vd-muted)]">
            Dauert etwa 15–30 Sekunden
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {["Deckblatt", "Hauptseite", "Fahrzeugtabelle"].map((label, i) => (
            <div
              key={label}
              className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1"
            >
              <LoaderCircle
                className="h-3 w-3 animate-spin text-neutral-500"
                style={{ animationDelay: `${i * 300}ms` }}
              />
              <span className="text-[0.68rem] font-medium text-neutral-600">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (state.phase === "review" && state.report) {
    return (
      <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-6 px-4 py-6">
        {state.error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[0.82rem] text-amber-900">
            <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
            {state.error}
          </div>
        ) : null}

        <ReviewSection
          report={state.report}
          previewUrl={previewUrl}
          pageCount={pageCount || 1}
          vehicleLabel={vehicleLabel}
          vehicleContext={vehicleContext}
          onSave={handleSave}
          onRescan={resetWizard}
          isSaving={isSaving}
          saveError={saveError}
        />
      </section>
    );
  }

  return null;
}
