"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileUp,
  LoaderCircle,
  Pencil,
  RotateCcw,
  X,
} from "lucide-react";

import { AbeVehicleMatchPicker } from "@/components/documents/abe-vehicle-match-picker";
import {
  AbeFieldLabel,
  AbeKbaHero,
  AbeSummaryRow,
} from "@/components/documents/abe-review-ui";
import { InBrowserCamera } from "@/components/documents/in-browser-camera";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localDateIso } from "@/lib/documents/format";
import { uploadDocument } from "@/lib/documents/upload-document";
import {
  auflagenForAbeVehicleGroup,
  groupAbeVehicleMatches,
  requiresAbeVehicleGroupSelection,
  resolveInitialAbeVehicleGroupIndex,
  selectedVerkaufsbezeichnungPayload,
} from "@/lib/ocr/abe-wizard-vehicle-match";
import { convertImagesToPdf } from "@/lib/utils/pdf-converter";
import type { AbeVehicleContext } from "@/lib/validations/abeSchema";
import {
  ABE_REQUIRED_FIELD_LABELS,
  emptyAbeDataHunterReport,
  fillAbeDataHunterReport,
  isAbeDataHunterReportComplete,
  missingAbeRequiredFields,
  type AbeDataHunterReport,
  type AbeRequiredFieldKey,
} from "@/lib/validations/abeDataHunterSchemas";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AbeDataHunterWizardProps {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
  vehicleContext?: AbeVehicleContext | null;
  successHref?: string;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
}

type WizardPhase = "hunt" | "review";

type ReviewFormState = {
  kbaNumber: string;
  abeNumber: string;
  abeHolder: string;
  manufacturer: string;
  partDesignation: string;
  markingText: string;
  auflagenCodes: string;
};

const REQUIRED_ORDER: AbeRequiredFieldKey[] = [
  "kbaNumber",
  "abeNumber",
  "abeHolder",
  "manufacturer",
  "partDesignation",
  "markingText",
  "verkaufsbezeichnung",
  "auflagenCodes",
];

// ─── API ───────────────────────────────────────────────────────────────────────

class HuntApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HuntApiError";
  }
}

async function extractAllFromFile(file: File): Promise<AbeDataHunterReport> {
  const body = new FormData();
  body.set("file", file);
  body.set("step", "hunt-all");

  const response = await fetch("/api/ocr/abe", { method: "POST", body });
  const payload = (await response.json().catch(() => null)) as
    | { ok: true; extraction: AbeDataHunterReport; reason?: string }
    | { ok: false; error?: string }
    | null;

  if (!response.ok || !payload || payload.ok !== true) {
    throw new HuntApiError(
      payload && "error" in payload && payload.error
        ? payload.error
        : `Analyse fehlgeschlagen (${response.status}).`,
    );
  }

  return payload.extraction;
}

function parseCodes(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,;\s]+/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  );
}

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function newlyFilledLabels(
  before: AbeDataHunterReport,
  after: AbeDataHunterReport,
): string[] {
  const beforeMissing = new Set(missingAbeRequiredFields(before));
  const afterMissing = new Set(missingAbeRequiredFields(after));
  return REQUIRED_ORDER.filter(
    (key) => beforeMissing.has(key) && !afterMissing.has(key),
  ).map((key) => ABE_REQUIRED_FIELD_LABELS[key]);
}

// ─── Progress overlay ──────────────────────────────────────────────────────────

function HuntProgressOverlay({
  report,
  analyzing,
  analyzingPdf,
  queuedCount,
  captureSummary,
  lastFound,
  onOpenReview,
  onUploadPdf,
  onClose,
}: {
  report: AbeDataHunterReport;
  analyzing: boolean;
  analyzingPdf: boolean;
  queuedCount: number;
  captureSummary: string | null;
  lastFound: string[];
  onOpenReview: () => void;
  onUploadPdf: (file: File) => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const missing = missingAbeRequiredFields(report);
  const complete = missing.length === 0;
  const currentKey = REQUIRED_ORDER[focusIndex] ?? REQUIRED_ORDER[0];
  const currentDone = !missing.includes(currentKey);

  // Jump to first open item when something gets filled.
  useEffect(() => {
    const firstOpen = REQUIRED_ORDER.findIndex((key) => missing.includes(key));
    if (firstOpen >= 0) setFocusIndex(firstOpen);
  }, [missing.join("|")]);

  function goPrev() {
    setFocusIndex(
      (index) => (index - 1 + REQUIRED_ORDER.length) % REQUIRED_ORDER.length,
    );
  }

  function goNext() {
    setFocusIndex((index) => (index + 1) % REQUIRED_ORDER.length);
  }

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[10050] px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div
        className="pointer-events-auto mx-auto max-w-[440px] rounded-2xl border border-white/20 bg-black/55 px-2 py-2 text-white shadow-lg backdrop-blur-md"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start === null) return;
          const end = event.changedTouches[0]?.clientX ?? start;
          const delta = end - start;
          if (Math.abs(delta) < 40) return;
          if (delta > 0) goPrev();
          else goNext();
        }}
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={goPrev}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10"
            aria-label="Vorheriger Punkt"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1 px-1 text-center">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/60">
              {focusIndex + 1} / {REQUIRED_ORDER.length}
              {captureSummary ? ` · ${captureSummary}` : ""}
            </p>
            <p className="truncate text-[0.88rem] font-semibold leading-tight">
              {ABE_REQUIRED_FIELD_LABELS[currentKey]}
            </p>
            <p
              className={[
                "mt-0.5 truncate text-[0.72rem] font-medium",
                currentDone ? "text-emerald-300" : "text-white/75",
              ].join(" ")}
            >
              {currentDone
                ? "Erfasst"
                : complete
                  ? "Alles erfasst"
                  : "Jetzt fotografieren"}
            </p>
          </div>

          <button
            type="button"
            onClick={goNext}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10"
            aria-label="Nächster Punkt"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {complete ? (
            <button
              type="button"
              disabled={analyzing}
              onClick={onOpenReview}
              className="flex h-8 shrink-0 items-center rounded-full bg-white px-3 text-[0.72rem] font-semibold text-neutral-900 disabled:opacity-40"
            >
              Prüfen
            </button>
          ) : null}
        </div>

        <label className="relative mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-[0.78rem] font-semibold text-white">
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUploadPdf(file);
              event.target.value = "";
            }}
          />
          <FileUp className="h-4 w-4" />
          PDF hochladen
        </label>

        <div className="mt-2 flex items-center gap-1 px-1">
          {REQUIRED_ORDER.map((key, index) => {
            const done = !missing.includes(key);
            const active = index === focusIndex;
            return (
              <span
                key={key}
                className={[
                  "h-1 flex-1 rounded-full transition-colors",
                  done
                    ? "bg-emerald-400"
                    : active
                      ? "bg-white"
                      : "bg-white/25",
                ].join(" ")}
              />
            );
          })}
        </div>

        {analyzing || lastFound.length > 0 ? (
          <div className="mt-1.5 flex min-h-[1.1rem] items-center justify-center gap-1.5 px-1 text-[0.68rem]">
            {analyzing ? (
              <span className="inline-flex items-center gap-1 text-amber-200">
                <LoaderCircle className="h-3 w-3 animate-spin" />
                {analyzingPdf ? "PDF wird analysiert…" : "Analysiert…"}
                {queuedCount > 0 ? `(+${queuedCount})` : ""}
              </span>
            ) : null}
            {!analyzing && lastFound.length > 0 ? (
              <span className="truncate text-emerald-200">
                Neu: {lastFound.join(" · ")}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/** Fixed PDF picker above the camera shutter — always visible. */
function PdfUploadFab({ onUpload }: { onUpload: (file: File) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <label className="relative fixed bottom-[max(7.25rem,calc(env(safe-area-inset-bottom)+5.5rem))] left-4 z-[10050] flex cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-black/60 px-4 py-2.5 text-[0.78rem] font-semibold text-white shadow-lg backdrop-blur-md">
      <input
        type="file"
        accept="application/pdf,.pdf"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.target.value = "";
        }}
      />
      <FileUp className="h-4 w-4" />
      PDF
    </label>,
    document.body,
  );
}

// ─── Review ────────────────────────────────────────────────────────────────────

function ReviewPanel({
  report,
  vehicleLabel,
  vehicleContext,
  selectedGroupIndex,
  onSelectGroup,
  onSave,
  onRestart,
  isSaving,
  saveError,
}: {
  report: AbeDataHunterReport;
  vehicleLabel: string;
  vehicleContext?: AbeVehicleContext | null;
  selectedGroupIndex: number | null;
  onSelectGroup: (index: number) => void;
  onSave: (form: ReviewFormState) => void;
  onRestart: () => void;
  isSaving: boolean;
  saveError: string | null;
}) {
  const [form, setForm] = useState<ReviewFormState>({
    kbaNumber: report.kbaNumber ?? "",
    abeNumber: report.abeNumber ?? "",
    abeHolder: report.abeHolder ?? "",
    manufacturer: report.manufacturer ?? "",
    partDesignation: report.partDesignation ?? "",
    markingText: report.markingText ?? "",
    auflagenCodes: report.auflagenCodes.join(" "),
  });
  const [isEditing, setIsEditing] = useState(false);
  const groups = useMemo(
    () => groupAbeVehicleMatches(report.vehicleMatches),
    [report.vehicleMatches],
  );
  const selectedVerkaufsbezeichnung =
    selectedGroupIndex !== null
      ? groups[selectedGroupIndex]?.verkaufsbezeichnung
      : groups[0]?.verkaufsbezeichnung;

  const draftReport: AbeDataHunterReport = {
    ...report,
    kbaNumber: form.kbaNumber.trim() || null,
    abeNumber: form.abeNumber.trim() || null,
    abeHolder: form.abeHolder.trim() || null,
    manufacturer: form.manufacturer.trim() || null,
    partDesignation: form.partDesignation.trim() || null,
    markingText: form.markingText.trim() || null,
    auflagenCodes: parseCodes(form.auflagenCodes),
  };
  const missing = missingAbeRequiredFields(
    draftReport,
    selectedVerkaufsbezeichnung,
  );

  return (
    <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-4 px-4 py-6">
      {groups.length > 0 ? (
        <AbeVehicleMatchPicker
          matches={report.vehicleMatches}
          selectedGroupIndex={selectedGroupIndex}
          onSelectGroup={onSelectGroup}
          vehicleContext={vehicleContext}
          vehicleLabel={vehicleLabel}
        />
      ) : null}

      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow)]">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
              Pflichtfelder
            </p>
            <h2 className="mt-1 text-[1.2rem] font-semibold text-[color:var(--vd-text)]">
              ABE Kern­daten
            </h2>
            <p className="mt-1 text-[0.78rem] text-[color:var(--vd-muted)]">
              Data-Hunter · {vehicleLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--vd-border)] px-3 py-1.5 text-[0.72rem] font-medium"
          >
            <Pencil className="h-3.5 w-3.5" />
            {isEditing ? "Ansicht" : "Bearbeiten"}
          </button>
        </header>

        <div className="mt-4 space-y-3">
          <AbeKbaHero
            value={form.kbaNumber}
            isEditing={isEditing}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, kbaNumber: e.target.value }))
            }
          />
          {isEditing ? (
            <div className="space-y-3">
              <AbeFieldLabel label="Nummer der ABE *">
                <Input
                  value={form.abeNumber}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, abeNumber: e.target.value }))
                  }
                  className="font-mono"
                />
              </AbeFieldLabel>
              <AbeFieldLabel label="Inhaber der ABE *">
                <Input
                  value={form.abeHolder}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, abeHolder: e.target.value }))
                  }
                />
              </AbeFieldLabel>
              <AbeFieldLabel label="Hersteller *">
                <Input
                  value={form.manufacturer}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      manufacturer: e.target.value,
                    }))
                  }
                />
              </AbeFieldLabel>
              <AbeFieldLabel label="Bezeichnung des Bauteils *">
                <Input
                  value={form.partDesignation}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      partDesignation: e.target.value,
                    }))
                  }
                />
              </AbeFieldLabel>
              <AbeFieldLabel label="Kennzeichnung *">
                <textarea
                  value={form.markingText}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      markingText: e.target.value,
                    }))
                  }
                  rows={4}
                  className="flex w-full rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5 text-[0.92rem] outline-none"
                />
              </AbeFieldLabel>
              <AbeFieldLabel label="Auflagen zum Fahrzeug *">
                <Input
                  value={form.auflagenCodes}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      auflagenCodes: e.target.value,
                    }))
                  }
                  className="font-mono"
                />
              </AbeFieldLabel>
            </div>
          ) : (
            <dl className="grid gap-2.5">
              <AbeSummaryRow label="Nummer der ABE" value={form.abeNumber} />
              <AbeSummaryRow label="Inhaber der ABE" value={form.abeHolder} />
              <AbeSummaryRow label="Hersteller" value={form.manufacturer} />
              <AbeSummaryRow
                label="Bezeichnung des Bauteils"
                value={form.partDesignation}
              />
              <AbeSummaryRow label="Kennzeichnung" value={form.markingText} />
              <AbeSummaryRow
                label="Verkaufsbezeichnung"
                value={selectedVerkaufsbezeichnung}
              />
              <AbeSummaryRow label="Auflagen" value={form.auflagenCodes} />
            </dl>
          )}
        </div>

        {missing.length > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-[0.78rem] text-amber-950">
            <p className="font-semibold">Noch Pflichtfelder offen:</p>
            <ul className="mt-1 list-disc pl-4">
              {missing.map((key) => (
                <li key={key}>{ABE_REQUIRED_FIELD_LABELS[key]}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {saveError ? (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-[0.78rem] text-amber-950"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{saveError}</span>
          </p>
        ) : null}

        <div className="mt-5 grid gap-2">
          <Button
            type="button"
            disabled={isSaving || missing.length > 0}
            onClick={() => onSave(form)}
          >
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Speichern…
              </span>
            ) : (
              "ABE speichern"
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onRestart}>
            <RotateCcw className="h-4 w-4" />
            Neu starten
          </Button>
        </div>
      </section>
    </section>
  );
}

// ─── Main wizard ───────────────────────────────────────────────────────────────

export function AbeDataHunterWizard({
  vehicleId,
  tagUuid,
  vehicleLabel,
  vehicleContext = null,
  successHref,
  onBack,
  backHref,
}: AbeDataHunterWizardProps) {
  const [phase, setPhase] = useState<WizardPhase>("hunt");
  const [report, setReport] = useState<AbeDataHunterReport>(() =>
    emptyAbeDataHunterReport(),
  );
  const [photos, setPhotos] = useState<File[]>([]);
  const [sourcePdf, setSourcePdf] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingPdf, setAnalyzingPdf] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [lastFound, setLastFound] = useState<string[]>([]);
  const [huntError, setHuntError] = useState<string | null>(null);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(
    null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  const queueRef = useRef<File[]>([]);
  const drainingRef = useRef(false);
  const reportRef = useRef(report);
  reportRef.current = report;

  const complete = isAbeDataHunterReportComplete(report);
  const captureSummary = sourcePdf
    ? "PDF"
    : photos.length > 0
      ? `${photos.length} Foto${photos.length === 1 ? "" : "s"}`
      : null;

  useEffect(() => {
    if (!complete) return;
    const groups = groupAbeVehicleMatches(report.vehicleMatches);
    setSelectedGroupIndex((current) => {
      if (current !== null && current < groups.length) return current;
      return resolveInitialAbeVehicleGroupIndex(groups);
    });
  }, [complete, report.vehicleMatches]);

  function goBack() {
    if (onBack) onBack();
    else if (backHref) window.location.href = backHref;
  }

  function restart() {
    queueRef.current = [];
    drainingRef.current = false;
    setPhase("hunt");
    setReport(emptyAbeDataHunterReport());
    setPhotos([]);
    setSourcePdf(null);
    setLastFound([]);
    setHuntError(null);
    setQueuedCount(0);
    setAnalyzing(false);
    setAnalyzingPdf(false);
    setSelectedGroupIndex(null);
    setSaveError(null);
  }

  async function drainQueue() {
    if (drainingRef.current) return;
    drainingRef.current = true;
    setAnalyzing(true);

    while (queueRef.current.length > 0) {
      const file = queueRef.current.shift()!;
      setQueuedCount(queueRef.current.length);
      setAnalyzingPdf(isPdfFile(file));

      try {
        const extracted = await extractAllFromFile(file);
        const before = reportRef.current;
        const merged = fillAbeDataHunterReport(before, extracted);
        const found = newlyFilledLabels(before, merged);

        reportRef.current = merged;
        setReport(merged);
        setLastFound(found);
        setHuntError(null);

        if (isAbeDataHunterReportComplete(merged)) {
          const groups = groupAbeVehicleMatches(merged.vehicleMatches);
          setSelectedGroupIndex(resolveInitialAbeVehicleGroupIndex(groups));
          // Finish remaining queue? Drop — we already have everything.
          queueRef.current = [];
          setQueuedCount(0);
          window.setTimeout(() => setPhase("review"), 400);
          break;
        }
      } catch (err) {
        setHuntError(
          err instanceof Error ? err.message : "Analyse fehlgeschlagen.",
        );
      }
    }

    drainingRef.current = false;
    setAnalyzing(false);
    setAnalyzingPdf(false);
    setQueuedCount(0);
  }

  function enqueueFile(file: File) {
    if (!isPdfFile(file) && !file.type.startsWith("image/")) {
      setHuntError("Bitte ein Foto oder PDF wählen.");
      return;
    }

    setHuntError(null);

    if (isPdfFile(file)) {
      setPhotos([]);
      setSourcePdf(file);
      queueRef.current = queueRef.current.filter((queued) => !isPdfFile(queued));
      queueRef.current.push(file);
    } else {
      setPhotos((prev) => [...prev, file]);
      queueRef.current.push(file);
    }

    setQueuedCount(queueRef.current.length);
    void drainQueue();
  }

  function handleSave(reviewForm: ReviewFormState) {
    const groups = groupAbeVehicleMatches(report.vehicleMatches);
    const needsSelection = requiresAbeVehicleGroupSelection(groups);
    const resolvedIndex = needsSelection
      ? selectedGroupIndex
      : (selectedGroupIndex ?? 0);
    const selectedGroup =
      resolvedIndex !== null ? groups[resolvedIndex] ?? null : null;

    const draft: AbeDataHunterReport = {
      ...report,
      kbaNumber: reviewForm.kbaNumber.trim() || null,
      abeNumber: reviewForm.abeNumber.trim() || null,
      abeHolder: reviewForm.abeHolder.trim() || null,
      manufacturer: reviewForm.manufacturer.trim() || null,
      partDesignation: reviewForm.partDesignation.trim() || null,
      markingText: reviewForm.markingText.trim() || null,
      auflagenCodes: parseCodes(reviewForm.auflagenCodes),
    };

    const stillMissing = missingAbeRequiredFields(
      draft,
      selectedGroup?.verkaufsbezeichnung,
    );
    if (stillMissing.length > 0) {
      setSaveError(
        `Pflichtfelder fehlen: ${stillMissing
          .map((key) => ABE_REQUIRED_FIELD_LABELS[key])
          .join(", ")}.`,
      );
      return;
    }

    const groupAuflagen = auflagenForAbeVehicleGroup(selectedGroup);
    const conditions =
      draft.auflagenCodes.length > 0 ? draft.auflagenCodes : groupAuflagen;
    const kbaDisplay = draft.kbaNumber ? `KBA ${draft.kbaNumber}` : null;
    const title =
      [draft.partDesignation || "ABE", draft.manufacturer]
        .filter(Boolean)
        .join(" · ") || "ABE";

    setSaveError(null);

    startSaveTransition(async () => {
      let uploadFile: File | null = sourcePdf;
      if (!uploadFile) {
        try {
          if (photos.length === 0) {
            setSaveError("Keine Fotos zum Speichern vorhanden.");
            return;
          }
          const pdf = await convertImagesToPdf(photos, {
            fileName: `abe-hunt-${Date.now()}`,
            fullBleed: true,
            imageCompression: "MEDIUM",
          });
          uploadFile = pdf.file;
        } catch {
          uploadFile = photos[0] ?? null;
        }
      }

      if (!uploadFile) {
        setSaveError("PDF konnte nicht erstellt werden.");
        return;
      }

      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("title", title);
      formData.set("type", "abe");
      formData.set("category", "abe");
      formData.set("vendor", draft.partDesignation ?? "");
      formData.set("date", localDateIso());
      formData.set("amount", "");
      formData.set("lineItems", "");
      formData.set("kbaNumber", draft.kbaNumber ?? "");
      formData.set(
        "vehicleApprovals",
        JSON.stringify(
          selectedGroup ? [selectedGroup.verkaufsbezeichnung] : [],
        ),
      );
      formData.set("authority", "");
      formData.set("conditions", JSON.stringify(conditions));
      formData.set(
        "technicalSpecs",
        JSON.stringify(
          [
            draft.abeNumber
              ? { label: "Nummer der ABE", value: draft.abeNumber }
              : null,
            draft.partDesignation
              ? {
                  label: "Bezeichnung des Bauteils",
                  value: draft.partDesignation,
                }
              : null,
            draft.markingText
              ? { label: "Kennzeichnung", value: draft.markingText }
              : null,
            selectedGroup
              ? {
                  label: "Verkaufsbezeichnung",
                  value: selectedGroup.verkaufsbezeichnung,
                }
              : null,
          ].filter(
            (item): item is { label: string; value: string } => item !== null,
          ),
        ),
      );
      formData.set("partCategory", kbaDisplay ?? draft.partDesignation ?? "");
      formData.set("notes", draft.markingText ?? "");
      formData.set("manufacturer", draft.manufacturer ?? "");
      formData.set("invoiceNumber", draft.abeNumber ?? "");
      formData.set("mileageKm", "");
      formData.set("pageCount", String(sourcePdf ? 1 : photos.length || 1));
      formData.set(
        "approvalFields",
        JSON.stringify({
          kind: "abe",
          data: {
            abeHolder: draft.abeHolder,
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

  if (phase === "review") {
    return (
      <ReviewPanel
        report={report}
        vehicleLabel={vehicleLabel}
        vehicleContext={vehicleContext}
        selectedGroupIndex={selectedGroupIndex}
        onSelectGroup={setSelectedGroupIndex}
        onSave={handleSave}
        onRestart={restart}
        isSaving={isSaving}
        saveError={saveError}
      />
    );
  }

  const errorBanner =
    huntError && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed bottom-4 left-4 right-4 z-[10060] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.82rem] text-red-800 shadow-lg">
            {huntError}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {errorBanner}

      <HuntProgressOverlay
        report={report}
        analyzing={analyzing}
        analyzingPdf={analyzingPdf}
        queuedCount={queuedCount}
        captureSummary={captureSummary}
        lastFound={lastFound}
        onOpenReview={() => setPhase("review")}
        onUploadPdf={enqueueFile}
        onClose={goBack}
      />

      <PdfUploadFab onUpload={enqueueFile} />

      <InBrowserCamera
        title="ABE scannen"
        hint="Fotografieren oder PDF hochladen — fehlende Punkte in der Leiste oben."
        guideLabel="Weiter fotografieren, bis alles grün ist"
        guideFrame="a4"
        allowPdf
        showBriefing={false}
        continuousCapture
        onCapture={enqueueFile}
        onClose={goBack}
      />
    </>
  );
}
