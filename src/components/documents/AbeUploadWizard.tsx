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
import { titleFromAbeFields } from "@/lib/documents/abe-title";
import { localDateIso } from "@/lib/documents/format";
import {
  auflagenForAbeVehicleGroup,
  groupAbeVehicleMatches,
  requiresAbeVehicleGroupSelection,
  resolveInitialAbeVehicleGroupIndex,
  selectedVerkaufsbezeichnungPayload,
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
import { ABE_REQUIRED_FIELD_LABELS } from "@/lib/validations/abeDataHunterSchemas";

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
    phase: "capture-main",
    stepNumber: 1,
    title: "Erste Seite der ABE",
    hint: "Scanne die erste Seite der ABE — das Blatt mit der Überschrift „Kraftfahrt-Bundesamt“ und dem Titel „Allgemeine Betriebserlaubnis“.",
    guideLabel: "Kraftfahrt-Bundesamt · Allgemeine Betriebserlaubnis",
  },
  {
    phase: "capture-cover",
    stepNumber: 2,
    title: "Hersteller-Deckblatt",
    hint: "Scanne das Hersteller-Deckblatt des Bauteils — z. B. Rad-Gutachten, Spoiler, Spurverbreiterung oder anderer ABE-Anhang. Suche KBA-Nummer, Genehmigungsnummer, Typ/Design und Maße.",
    guideLabel: "KBA · Genehmigungsnummer · Typ · Maße",
  },
  {
    phase: "capture-vehicles",
    stepNumber: 3,
    title: "Fahrzeugtabelle",
    hint: "Scanne die Verwendungs- bzw. Fahrzeugtabelle mit „Verkaufsbezeichnung:“ und den Tabellenzeilen darunter (Fahrzeugtyp, Betriebserlaubnis, ggf. Reifen, Auflagen).",
    guideLabel: "Verkaufsbezeichnung · Tabellenzeilen",
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
  const pages = [mainFile, coverFile, vehiclesFile].filter(
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
  approvalNumber: string;
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
    approvalNumber: report.approvalNumber ?? "",
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
  selectedGroupIndex: number | null;
}

function ReviewSection({
  report,
  previewUrl,
  vehiclesPreviewUrl,
  pageCount,
  vehicleLabel,
  vehicleContext,
  onSave,
  onRescan,
  onRescanVehicles,
  isSaving,
  saveError,
}: {
  report: AbeWizardReport;
  previewUrl: string | null;
  vehiclesPreviewUrl: string | null;
  pageCount: number;
  vehicleLabel: string;
  vehicleContext?: AbeVehicleContext | null;
  onSave: (payload: ReviewSavePayload) => void;
  onRescan: () => void;
  onRescanVehicles: () => void;
  isSaving: boolean;
  saveError: string | null;
}) {
  const [form, setForm] = useState<ReviewFormState>(() =>
    reportToFormState(report),
  );
  const [isEditing, setIsEditing] = useState(false);
  const vehicleGroups = useMemo(
    () => groupAbeVehicleMatches(report.vehicleMatches),
    [report.vehicleMatches],
  );
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(
    null,
  );
  const [selectionError, setSelectionError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedGroupIndex((current) => {
      if (vehicleGroups.length === 0) return null;
      if (current !== null && current < vehicleGroups.length) return current;
      return resolveInitialAbeVehicleGroupIndex(vehicleGroups);
    });
  }, [vehicleGroups]);

  const set =
    (key: keyof ReviewFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="vd-anim-header flex flex-col gap-4">
      {vehicleGroups.length > 0 ? (
        <AbeVehicleMatchPicker
          matches={report.vehicleMatches}
          selectedGroupIndex={selectedGroupIndex}
          onSelectGroup={(index) => {
            setSelectedGroupIndex(index);
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
            Auf dem Foto in Schritt 3 wurde keine Tabelle mit
            „Verkaufsbezeichnung:“ und Tabellenzeilen erkannt. Häufig wird
            versehentlich das ABE-Deckblatt oder eine Textseite gescannt.
          </p>
          {vehiclesPreviewUrl ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-amber-200 bg-white">
              <p className="border-b border-amber-100 px-3 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-amber-900">
                Dein Scan · Schritt 3
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={vehiclesPreviewUrl}
                alt="Gescannte Fahrzeugtabelle"
                className="max-h-52 w-full object-contain bg-neutral-100"
              />
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full border-amber-400 bg-white text-amber-950 hover:bg-amber-100"
            onClick={onRescanVehicles}
          >
            <RotateCcw className="h-4 w-4" />
            Schritt 3 erneut scannen
          </Button>
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

          {!form.kbaNumber.trim() && form.approvalNumber.trim() && !isEditing ? (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3">
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
                Genehmigungsnummer
              </p>
              <p className="mt-1 font-mono text-[1.2rem] font-semibold tracking-wide text-[color:var(--vd-text)]">
                {form.approvalNumber.trim()}
              </p>
            </div>
          ) : null}

          {isEditing ? (
            <div className="space-y-3">
              <AbeFieldLabel label="Genehmigungsnummer">
                <Input
                  value={form.approvalNumber}
                  onChange={set("approvalNumber")}
                  placeholder="Genehmigungsnummer / Gutachten-Nr."
                />
              </AbeFieldLabel>
              <AbeFieldLabel label="ABE-Nummer (KBA-Deckblatt)">
                <Input
                  value={form.abeNumber}
                  onChange={set("abeNumber")}
                  placeholder="ABE-Nummer"
                />
              </AbeFieldLabel>
              <AbeFieldLabel label={ABE_REQUIRED_FIELD_LABELS.abeHolder}>
                <Input
                  value={form.abeHolder}
                  onChange={set("abeHolder")}
                  placeholder="Inhaber laut Dokument"
                />
              </AbeFieldLabel>
              <AbeFieldLabel label={ABE_REQUIRED_FIELD_LABELS.manufacturer}>
                <Input
                  value={form.manufacturer}
                  onChange={set("manufacturer")}
                  placeholder="Hersteller / Herstellerzeichen laut Dokument"
                />
              </AbeFieldLabel>
              <AbeFieldLabel label="Prüforganisation">
                <Input
                  value={form.testingOrganization}
                  onChange={set("testingOrganization")}
                  placeholder="Prüforganisation laut Dokument"
                />
              </AbeFieldLabel>
              <AbeFieldLabel label="Typ / Design">
                <Input
                  value={form.designType}
                  onChange={set("designType")}
                  placeholder="Typ oder Design laut Deckblatt"
                />
              </AbeFieldLabel>
              <AbeFieldLabel label="Maße / Abmessungen">
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
              {form.approvalNumber.trim() ? (
                <AbeSummaryRow
                  label="Genehmigungsnummer"
                  value={form.approvalNumber}
                />
              ) : null}
              <AbeSummaryRow label="ABE-Nummer" value={form.abeNumber} />
              <AbeSummaryRow label={ABE_REQUIRED_FIELD_LABELS.abeHolder} value={form.abeHolder} />
              <AbeSummaryRow label={ABE_REQUIRED_FIELD_LABELS.manufacturer} value={form.manufacturer} />
              <AbeSummaryRow
                label="Prüforganisation"
                value={form.testingOrganization}
              />
              <AbeSummaryRow label="Typ / Design" value={form.designType} />
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
              if (vehicleGroups.length === 0) {
                setSelectionError(null);
                onSave({ form, selectedGroupIndex: null });
                return;
              }
              const needsSelection = requiresAbeVehicleGroupSelection(
                vehicleGroups,
              );
              const resolvedIndex = needsSelection
                ? selectedGroupIndex
                : (selectedGroupIndex ?? 0);
              if (resolvedIndex === null) {
                setSelectionError(
                  "Bitte wähle die passende Verkaufsbezeichnung.",
                );
                return;
              }
              setSelectionError(null);
              onSave({ form, selectedGroupIndex: resolvedIndex });
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
    phase: "capture-main",
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
  const [vehiclesPreviewUrl, setVehiclesPreviewUrl] = useState<string | null>(
    null,
  );

  const pageCount = useMemo(
    () =>
      [state.coverFile, state.mainFile, state.vehiclesFile].filter(Boolean)
        .length,
    [state.coverFile, state.mainFile, state.vehiclesFile],
  );

  useEffect(() => {
    const source = state.mainFile ?? state.coverFile ?? state.vehiclesFile;
    if (!source) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(source);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [state.coverFile, state.mainFile, state.vehiclesFile]);

  useEffect(() => {
    if (!state.vehiclesFile) {
      setVehiclesPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(state.vehiclesFile);
    setVehiclesPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [state.vehiclesFile]);

  function goBack() {
    if (onBack) onBack();
    else if (backHref) window.location.href = backHref;
  }

  function resetWizard() {
    setState({
      phase: "capture-main",
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

  function rescanVehiclesStep() {
    setState((prev) => ({
      ...prev,
      phase: "capture-vehicles",
      error: null,
    }));
    setSaveError(null);
  }

  function handleMainCapture(file: File) {
    setState((prev) => ({
      ...prev,
      mainFile: file,
      phase: "capture-cover",
      error: null,
    }));
  }

  function handleCoverCapture(file: File) {
    setState((prev) => ({
      ...prev,
      coverFile: file,
      phase: "capture-vehicles",
      error: null,
    }));
  }

  function handleVehiclesCapture(file: File) {
    setState((prev) => {
      void runAnalysis({
        coverFile: prev.coverFile!,
        vehiclesFile: file,
        mainFile: prev.mainFile,
        reuseCover: prev.coverExtraction,
        reuseMain: prev.mainExtraction,
      });
      return {
        ...prev,
        vehiclesFile: file,
        phase: "analyzing",
        error: null,
      };
    });
  }

  async function runAnalysis({
    coverFile,
    vehiclesFile,
    mainFile,
    reuseCover = null,
    reuseMain = null,
  }: {
    coverFile: File;
    vehiclesFile: File;
    mainFile: File | null;
    reuseCover?: AbeWizardCoverExtraction | null;
    reuseMain?: AbeWizardMainExtraction | null;
  }) {
    try {
      const [coverResult, mainResult, vehiclesResult] = await Promise.all([
        reuseCover
          ? Promise.resolve(reuseCover)
          : fetchCoverExtraction(coverFile),
        reuseMain !== null
          ? Promise.resolve(reuseMain)
          : mainFile
            ? fetchMainExtraction(mainFile)
            : Promise.resolve(null),
        fetchVehiclesExtraction(vehiclesFile),
      ]);

      const report = mergeAbeWizardSteps(coverResult, mainResult, vehiclesResult);

      setState((prev) => ({
        ...prev,
        phase: "review",
        coverExtraction: coverResult,
        mainExtraction: mainResult,
        vehiclesExtraction: vehiclesResult,
        report,
        uploadFile: null,
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

  function handleSave({ form, selectedGroupIndex }: ReviewSavePayload) {
    if (!state.report) {
      setSaveError("Keine Daten zum Speichern vorhanden.");
      return;
    }

    const groups = groupAbeVehicleMatches(state.report.vehicleMatches);
    const needsSelection = requiresAbeVehicleGroupSelection(groups);
    const resolvedIndex = needsSelection
      ? selectedGroupIndex
      : (selectedGroupIndex ?? 0);

    if (groups.length > 0 && resolvedIndex === null) {
      setSaveError("Bitte wähle die passende Verkaufsbezeichnung.");
      return;
    }

    setSaveError(null);

    const selectedGroup =
      resolvedIndex !== null ? groups[resolvedIndex] ?? null : null;

    const title = titleFromAbeFields({
      manufacturer: form.manufacturer.trim() || form.abeHolder.trim(),
      partType: form.designType.trim(),
    });

    const articleList = form.articleNumbers
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const vehicleApprovals = selectedGroup
      ? [selectedGroup.verkaufsbezeichnung]
      : [];
    const filteredAuflagen = auflagenForAbeVehicleGroup(selectedGroup);

    const technicalSpecs = [
      form.approvalNumber.trim()
        ? { label: "Genehmigungsnummer", value: form.approvalNumber.trim() }
        : null,
      form.abeNumber.trim()
        ? { label: "ABE-Nummer", value: form.abeNumber.trim() }
        : null,
      form.designType.trim()
        ? { label: "Typ / Design", value: form.designType.trim() }
        : null,
      form.dimensions.trim()
        ? { label: "Maße", value: form.dimensions.trim() }
        : null,
      articleList.length > 0
        ? { label: "Artikel-Nr.", value: articleList.join(", ") }
        : null,
    ].filter((item): item is { label: string; value: string } => item !== null);

    startSaveTransition(async () => {
      let uploadFile = state.uploadFile;
      if (!uploadFile) {
        try {
          uploadFile = await buildUploadFile(
            state.coverFile,
            state.mainFile,
            state.vehiclesFile,
          );
        } catch {
          uploadFile = null;
        }
      }
      if (!uploadFile) {
        setSaveError("PDF konnte nicht erstellt werden. Bitte erneut scannen.");
        return;
      }

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
      formData.set("partCategory", "");
      formData.set("notes", "");
      formData.set("manufacturer", form.manufacturer.trim());
      formData.set("invoiceNumber", form.abeNumber.trim() || form.approvalNumber.trim());
      formData.set("mileageKm", "");
      formData.set("pageCount", String(pageCount || 1));
      formData.set(
        "approvalFields",
        JSON.stringify({
          kind: "abe",
          data: {
            abeHolder: form.abeHolder.trim() || null,
            ...(selectedGroup
              ? selectedVerkaufsbezeichnungPayload(selectedGroup)
              : {}),
          },
        }),
      );
      formData.set("file", uploadFile);

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
          key={state.phase}
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
            if (phase === "capture-main") goBack();
            else if (phase === "capture-cover") {
              setState((prev) => ({ ...prev, phase: "capture-main" }));
            } else {
              setState((prev) => ({ ...prev, phase: "capture-cover" }));
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
          {["ABE-Deckblatt", "Hersteller-Deckblatt", "Fahrzeugtabelle"].map((label, i) => (
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
          vehiclesPreviewUrl={vehiclesPreviewUrl}
          pageCount={pageCount || 1}
          vehicleLabel={vehicleLabel}
          vehicleContext={vehicleContext}
          onSave={handleSave}
          onRescan={resetWizard}
          onRescanVehicles={rescanVehiclesStep}
          isSaving={isSaving}
          saveError={saveError}
        />
      </section>
    );
  }

  return null;
}
