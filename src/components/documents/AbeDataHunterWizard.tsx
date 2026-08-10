"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Camera,
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
import { ABE_VEHICLE_MODEL_DISPLAY_LABEL } from "@/lib/documents/abe-detail-display";
import { uploadDocument } from "@/lib/documents/upload-document";
import {
  abeAuflagenConditionsFromNotes,
  auflagenCodesCoveredInNotes,
  missingAuflagenCodesInNotes,
} from "@/lib/ocr/abe-auflagen-from-text";
import {
  augmentAuflagenNotesWithKuerzelDb,
  extractKuerzelRecordsFromOcrNotes,
} from "@/lib/ocr/auflagen-kuerzel-db";
import {
  buildClientAuflagenKuerzelDb,
  fetchServerAuflagenKuerzelRecords,
  learnAuflagenKuerzelRecords,
} from "@/lib/ocr/auflagen-kuerzel-client";
import { AbeAuflagenFoldList } from "@/components/documents/abe-auflagen-fold-list";
import {
  auflagenForUserVehicleSelection,
  defaultAbeRowIdForGroup,
  groupAbeVehicleMatches,
  isAbeVehicleTableSelectionReady,
  resolveAbeHuntGroupIndex,
  selectedAbeVehicleGroup,
  selectedVerkaufsbezeichnungPayload,
  verkaufsbezeichnungForAbeHuntGroup,
} from "@/lib/ocr/abe-wizard-vehicle-match";
import { convertImagesToPdf } from "@/lib/utils/pdf-converter";
import type { AbeVehicleContext } from "@/lib/validations/abeSchema";
import {
  normalizeAbeKbaDigits,
  normalizeAbeNumberDigits,
  inferAbeKbaFromReport,
} from "@/lib/validations/abeSchema";
import {
  ABE_HUNT_FIELD_SCAN_HINTS,
  ABE_HUNT_FIELD_WATERMARKS,
  ABE_REQUIRED_FIELD_LABELS,
  ABE_CORE_HUNT_FIELD_KEYS,
  abeHuntFieldDisplayLabel,
  emptyAbeDataHunterReport,
  fillAbeDataHunterReport,
  finalizeAbeDataHunterReport,
  isAbeCoreHuntComplete,
  isAbeDataHunterReportComplete,
  missingAbeCoreHuntFields,
  missingAbeRequiredFields,
  scopeAbeDataHunterReportAuflagen,
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

type WizardPhase =
  | "choose"
  | "kba-hunt"
  | "hunt"
  | "auflagen-detail"
  | "auflagen-scan"
  | "review";
type HuntMode = "camera" | "pdf";

type ReviewFormState = {
  kbaNumber: string;
  abeNumber: string;
  abeHolder: string;
  manufacturer: string;
  partDesignation: string;
  markingText: string;
  auflagenCodes: string;
  auflagenNotes: string;
};

const CORE_HUNT_ORDER = ABE_CORE_HUNT_FIELD_KEYS;

function reportKbaDigits(report: AbeDataHunterReport): string | null {
  return inferAbeKbaFromReport(report);
}

function huntGroupContext(
  report: AbeDataHunterReport,
  selectedGroupIndex: number | null,
  vehicleContext?: AbeVehicleContext | null,
) {
  const groups = groupAbeVehicleMatches(report.vehicleMatches);
  const index = resolveAbeHuntGroupIndex(
    groups,
    vehicleContext,
    selectedGroupIndex,
  );
  return {
    groups,
    index,
    verkaufsbezeichnung: verkaufsbezeichnungForAbeHuntGroup(groups, index),
  };
}

function selectedVerkaufsbezeichnungForReport(
  report: AbeDataHunterReport,
  groupIndex: number | null,
  vehicleContext?: AbeVehicleContext | null,
): string | null {
  return huntGroupContext(report, groupIndex, vehicleContext).verkaufsbezeichnung;
}

function missingCoreHuntFieldSet(
  report: AbeDataHunterReport,
  selectedVerkaufsbezeichnung?: string | null,
  vehicleContext?: AbeVehicleContext | null,
): Set<AbeRequiredFieldKey> {
  return new Set(
    missingAbeCoreHuntFields(
      report,
      selectedVerkaufsbezeichnung,
      vehicleContext,
    ),
  );
}

function firstMissingFocusIndex(
  report: AbeDataHunterReport,
  selectedVerkaufsbezeichnung?: string | null,
  vehicleContext?: AbeVehicleContext | null,
): number {
  const missing = missingCoreHuntFieldSet(
    report,
    selectedVerkaufsbezeichnung,
    vehicleContext,
  );
  for (let index = 0; index < CORE_HUNT_ORDER.length; index++) {
    const key = CORE_HUNT_ORDER[index];
    if (key && missing.has(key)) return index;
  }
  return Math.max(0, CORE_HUNT_ORDER.length - 1);
}

function countAbeCoreHuntFieldsDone(
  report: AbeDataHunterReport,
  selectedVerkaufsbezeichnung?: string | null,
  vehicleContext?: AbeVehicleContext | null,
): number {
  const missing = missingCoreHuntFieldSet(
    report,
    selectedVerkaufsbezeichnung,
    vehicleContext,
  );
  return CORE_HUNT_ORDER.length - missing.size;
}

function firstMissingFocusKey(
  report: AbeDataHunterReport,
  selectedVerkaufsbezeichnung?: string | null,
  vehicleContext?: AbeVehicleContext | null,
): AbeRequiredFieldKey {
  const index = firstMissingFocusIndex(
    report,
    selectedVerkaufsbezeichnung,
    vehicleContext,
  );
  return CORE_HUNT_ORDER[index] ?? "kbaNumber";
}

// ─── KBA-first step ────────────────────────────────────────────────────────────

function KbaHuntOverlay({
  report,
  manualValue,
  analyzing,
  analyzingPdf,
  queuedCount,
  captureSummary,
  onManualChange,
  onContinue,
  onClose,
}: {
  report: AbeDataHunterReport;
  manualValue: string;
  analyzing: boolean;
  analyzingPdf: boolean;
  queuedCount: number;
  captureSummary: string | null;
  onManualChange: (value: string) => void;
  onContinue: () => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const detectedKba = reportKbaDigits(report);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[10050] px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="pointer-events-auto mx-auto max-w-[440px] rounded-2xl border border-white/20 bg-black/55 px-3 py-3 text-white shadow-lg backdrop-blur-md">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/60">
              Schritt 1 · KBA-Nummer
              {captureSummary ? ` · ${captureSummary}` : ""}
            </p>
            <p className="mt-0.5 text-[0.95rem] font-semibold leading-tight">
              {detectedKba ? `KBA ${detectedKba} erkannt` : "KBA-Nummer erfassen"}
            </p>
            <p className="mt-1 text-[0.74rem] font-medium leading-snug text-white/85">
              {analyzing
                ? "Foto wird ausgewertet…"
                : "Fotografiere „Gutachten zur ABE Nr.“ oder „KBA-Nummer“ — oder tippe die Nummer ein."}
            </p>
          </div>

          {detectedKba ? (
            <button
              type="button"
              disabled={analyzing}
              onClick={onContinue}
              className="mt-0.5 flex h-8 shrink-0 items-center rounded-full bg-white px-3 text-[0.72rem] font-semibold text-neutral-900 disabled:opacity-40"
            >
              Weiter
            </button>
          ) : (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-[0.72rem] font-bold text-amber-100">
              1
            </div>
          )}
        </div>

        <div className="mt-3 px-0.5">
          <label className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-white/60">
            Manuell eingeben
          </label>
          <Input
            inputMode="numeric"
            placeholder="z. B. 48571"
            value={manualValue}
            onChange={(event) => onManualChange(event.target.value)}
            className="mt-1.5 h-11 border-white/20 bg-white/10 text-[1rem] font-semibold text-white placeholder:text-white/40"
          />
        </div>

        {analyzing ? (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[0.68rem] text-amber-200">
            <LoaderCircle className="h-3 w-3 animate-spin" />
            {analyzingPdf ? "PDF wird analysiert…" : "Analysiert…"}
            {queuedCount > 0 ? `(+${queuedCount})` : ""}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

// ─── API ───────────────────────────────────────────────────────────────────────

class HuntApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HuntApiError";
  }
}

async function extractAuflagenTextFromFile(
  file: File,
  targetCodes: string[],
): Promise<string> {
  const body = new FormData();
  body.set("file", file);
  body.set("step", "hunt-auflagen-text");
  body.set("targetCodes", JSON.stringify(targetCodes));

  const response = await fetch("/api/ocr/abe", { method: "POST", body });
  const payload = (await response.json().catch(() => null)) as
    | {
        ok: true;
        extraction: { auflagenNotes: string | null };
        reason?: string;
      }
    | { ok: false; error?: string }
    | null;

  if (!response.ok || !payload || payload.ok !== true) {
    throw new HuntApiError(
      payload && "error" in payload && payload.error
        ? payload.error
        : `Auflagen-Text fehlgeschlagen (${response.status}).`,
    );
  }

  const notes = payload.extraction.auflagenNotes?.trim();
  if (!notes) {
    throw new HuntApiError(
      payload.reason ??
        "Kein Auflagen-Text erkannt — bitte den Abschnitt erneut fotografieren.",
    );
  }

  return notes;
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

  return finalizeAbeDataHunterReport(payload.extraction);
}

async function extractKbaFromFile(file: File): Promise<AbeDataHunterReport> {
  const body = new FormData();
  body.set("file", file);
  body.set("step", "hunt-kba");

  const response = await fetch("/api/ocr/abe", { method: "POST", body });
  const payload = (await response.json().catch(() => null)) as
    | {
        ok: true;
        extraction: {
          kbaNumber: string | null;
          abeNumber: string | null;
        };
        reason?: string;
      }
    | { ok: false; error?: string }
    | null;

  if (!response.ok || !payload || payload.ok !== true) {
    throw new HuntApiError(
      payload && "error" in payload && payload.error
        ? payload.error
        : `KBA-Analyse fehlgeschlagen (${response.status}).`,
    );
  }

  return finalizeAbeDataHunterReport(
    fillAbeDataHunterReport(emptyAbeDataHunterReport(), {
      ...emptyAbeDataHunterReport(),
      kbaNumber: payload.extraction.kbaNumber,
      abeNumber: payload.extraction.abeNumber,
    }),
  );
}

async function extractForHuntFocus(
  file: File,
  _focusKey: AbeRequiredFieldKey,
): Promise<AbeDataHunterReport> {
  return extractAllFromFile(file);
}

function enrichAfterHuntMerge(
  report: AbeDataHunterReport,
  selectedGroupIndex: number | null,
  vehicleContext?: AbeVehicleContext | null,
) {
  const { index, verkaufsbezeichnung } = huntGroupContext(
    report,
    selectedGroupIndex,
    vehicleContext,
  );
  const scoped = scopeAbeDataHunterReportAuflagen(
    report,
    verkaufsbezeichnung,
    vehicleContext,
  );
  return {
    report: scoped,
    groupIndex: index,
    verkaufsbezeichnung,
  };
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
  selectedVerkaufsbezeichnung?: string | null,
  vehicleContext?: AbeVehicleContext | null,
): string[] {
  const beforeMissing = missingCoreHuntFieldSet(
    before,
    selectedVerkaufsbezeichnung,
    vehicleContext,
  );
  const afterMissing = missingCoreHuntFieldSet(
    after,
    selectedVerkaufsbezeichnung,
    vehicleContext,
  );
  return CORE_HUNT_ORDER.filter(
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
  onClose,
  vehicleContext,
}: {
  report: AbeDataHunterReport;
  analyzing: boolean;
  analyzingPdf: boolean;
  queuedCount: number;
  captureSummary: string | null;
  lastFound: string[];
  onOpenReview: () => void;
  onClose: () => void;
  vehicleContext?: AbeVehicleContext | null;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const missing = missingAbeCoreHuntFields(report, null, vehicleContext);
  const missingSet = new Set(missing);
  const complete = missing.length === 0;
  const doneCount = countAbeCoreHuntFieldsDone(report, null, vehicleContext);
  const totalCount = CORE_HUNT_ORDER.length;

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[10050] px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="pointer-events-auto mx-auto max-w-[440px] rounded-2xl border border-white/20 bg-black/55 px-3 py-2.5 text-white shadow-lg backdrop-blur-md">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/60">
              ABE scannen
              {captureSummary ? ` · ${captureSummary}` : ""}
            </p>
            <p className="mt-0.5 text-[0.95rem] font-semibold leading-tight">
              {complete
                ? "Alle Pflichtfelder erfasst"
                : `${doneCount} / ${totalCount} Pflichtfelder`}
            </p>
            <p className="mt-1 text-[0.74rem] font-medium leading-snug text-white/85">
              {complete
                ? "Tippe auf Weiter für die Auflagen."
                : analyzing
                  ? "Foto wird ausgewertet…"
                  : "Fotografiere sichtbare Abschnitte — pro Foto können mehrere Felder erkannt werden."}
            </p>
          </div>

          {complete ? (
            <button
              type="button"
              disabled={analyzing}
              onClick={onOpenReview}
              className="mt-0.5 flex h-8 shrink-0 items-center rounded-full bg-white px-3 text-[0.72rem] font-semibold text-neutral-900 disabled:opacity-40"
            >
              Weiter
            </button>
          ) : (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/20 font-mono text-[0.72rem] font-bold text-amber-100">
              {missing.length}
            </div>
          )}
        </div>

        <ul className="mt-2.5 space-y-1 px-0.5">
          {CORE_HUNT_ORDER.map((key) => {
            const done = !missingSet.has(key);
            return (
              <li
                key={key}
                className={[
                  "flex items-center gap-2 rounded-lg px-2 py-1 text-[0.72rem]",
                  done ? "text-emerald-100" : "text-white/75",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.58rem] font-bold",
                    done
                      ? "bg-emerald-400 text-emerald-950"
                      : "border border-white/30 text-white/50",
                  ].join(" ")}
                  aria-hidden
                >
                  {done ? "✓" : ""}
                </span>
                <span className="truncate">{abeHuntFieldDisplayLabel(key)}</span>
              </li>
            );
          })}
        </ul>

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
                Neu erfasst: {lastFound.join(" · ")}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function AuflagenScanOverlay({
  targetCodes,
  auflagenNotes,
  analyzing,
  queuedCount,
  captureSummary,
  onOpenReview,
  onClose,
}: {
  targetCodes: string[];
  auflagenNotes: string | null;
  analyzing: boolean;
  queuedCount: number;
  captureSummary: string | null;
  onOpenReview: () => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const missingCodes = missingAuflagenCodesInNotes(auflagenNotes, targetCodes);
  const capturedCodes = auflagenCodesCoveredInNotes(auflagenNotes, targetCodes);
  const canProceed =
    targetCodes.length === 0
      ? Boolean(auflagenNotes?.trim())
      : missingCodes.length === 0 && Boolean(auflagenNotes?.trim());

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[10050] px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="pointer-events-auto mx-auto max-w-[440px] rounded-2xl border border-white/20 bg-black/55 px-3 py-2.5 text-white shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/60">
              Schritt 2 · Auflagen-Text
              {captureSummary ? ` · ${captureSummary}` : ""}
              {targetCodes.length > 0
                ? ` · ${capturedCodes.length}/${targetCodes.length}`
                : ""}
            </p>
            <p className="truncate text-[0.88rem] font-semibold leading-tight">
              {ABE_REQUIRED_FIELD_LABELS.auflagenNotes}
            </p>
            <p className="mt-0.5 text-[0.72rem] font-medium leading-snug text-white/75">
              {missingCodes.length > 0
                ? `Noch fotografieren: ${missingCodes.join(", ")}`
                : (ABE_HUNT_FIELD_SCAN_HINTS.auflagenNotes?.scanAction ??
                  "Fotografiere die Erklärungen zu den Auflagen-Nummern.")}
            </p>
          </div>

          {canProceed ? (
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

        {targetCodes.length > 0 ? (
          <div className="mt-2.5 px-0.5">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-white/50">
              Auflagen-Kürzel aus der Fahrzeugtabelle
            </p>
            <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
              {targetCodes.map((code) => {
                const captured = !missingCodes.some(
                  (missing) => missing.toUpperCase() === code.toUpperCase(),
                );
                return (
                  <span
                    key={code}
                    className={`rounded-full border px-2.5 py-0.5 font-mono text-[0.78rem] font-semibold ${
                      captured
                        ? "border-emerald-300/50 bg-emerald-500/20 text-emerald-100"
                        : "border-amber-300/60 bg-amber-500/20 text-amber-100"
                    }`}
                  >
                    {code}
                  </span>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="mt-2 px-1 text-center text-[0.72rem] text-white/70">
            Fotografiere den Auflagen-Abschnitt der ABE wörtlich.
          </p>
        )}

        {analyzing ? (
          <div className="mt-2 flex min-h-[1.1rem] items-center justify-center gap-1.5 text-[0.68rem]">
            <span className="inline-flex items-center gap-1 text-amber-200">
              <LoaderCircle className="h-3 w-3 animate-spin" />
              Auflagen-Text wird erkannt…
              {queuedCount > 0 ? `(+${queuedCount})` : ""}
            </span>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function AuflagenDetailPanel({
  report,
  vehicleLabel,
  vehicleContext,
  selectedGroupIndex,
  selectedRowId,
  dbResolvedCodes,
  missingCodes,
  onSelectGroup,
  onSelectRow,
  onContinueToReview,
  onStartScan,
  onBack,
}: {
  report: AbeDataHunterReport;
  vehicleLabel: string;
  vehicleContext?: AbeVehicleContext | null;
  selectedGroupIndex: number | null;
  selectedRowId: string | null;
  dbResolvedCodes: string[];
  missingCodes: string[];
  onSelectGroup: (index: number) => void;
  onSelectRow: (rowId: string) => void;
  onContinueToReview: () => void;
  onStartScan: () => void;
  onBack: () => void;
}) {
  const groups = useMemo(
    () => groupAbeVehicleMatches(report.vehicleMatches),
    [report.vehicleMatches],
  );
  const selectedGroup = selectedAbeVehicleGroup(report, selectedGroupIndex);
  const selectedVerkaufsbezeichnung = selectedGroup?.verkaufsbezeichnung ?? null;
  const vehicleSelectionReady = isAbeVehicleTableSelectionReady(
    groups,
    selectedGroupIndex,
    selectedRowId,
  );
  const targetCodes = auflagenForUserVehicleSelection(
    report,
    selectedGroupIndex,
    selectedRowId,
  );
  const allCodesKnown =
    targetCodes.length > 0 && missingCodes.length === 0;
  const dbResolvedSet = new Set(
    dbResolvedCodes.map((code) => code.toUpperCase()),
  );

  return (
    <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-4 px-4 py-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1.5 text-[0.82rem] font-medium text-[color:var(--vd-muted)]"
      >
        Zurück
      </button>

      {groups.length > 0 ? (
        <AbeVehicleMatchPicker
          matches={report.vehicleMatches}
          selectedGroupIndex={selectedGroupIndex}
          onSelectGroup={onSelectGroup}
          selectedRowId={selectedRowId}
          onSelectRow={onSelectRow}
          vehicleContext={vehicleContext}
          vehicleLabel={vehicleLabel}
        />
      ) : null}

      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow)]">
        <header>
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            Schritt 2 · Auflagen vorbereiten
          </p>
          <h1 className="mt-2 text-[1.35rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
            Fahrzeug wählen, Auflagen prüfen
          </h1>
          <p className="mt-2 text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
            {vehicleLabel} · Bekannte Kürzel werden automatisch aus der
            Datenbank ergänzt. Nur fehlende Texte musst du noch fotografieren.
          </p>
        </header>

        <dl className="mt-5 grid gap-2.5">
          <AbeKbaHero value={report.kbaNumber ?? ""} />
          <AbeSummaryRow label="Nummer der ABE" value={report.abeNumber} />
          <AbeSummaryRow
            label={ABE_REQUIRED_FIELD_LABELS.abeHolder}
            value={report.abeHolder}
          />
          <AbeSummaryRow
            label={ABE_REQUIRED_FIELD_LABELS.manufacturer}
            value={report.manufacturer}
          />
          <AbeSummaryRow
            label="Bezeichnung des Bauteils"
            value={report.partDesignation}
          />
          <AbeSummaryRow
            label={ABE_VEHICLE_MODEL_DISPLAY_LABEL}
            value={selectedVerkaufsbezeichnung}
          />
          <AbeSummaryRow
            label="Auflagen-Kürzel"
            value={targetCodes.join(" · ") || null}
          />
        </dl>

        {targetCodes.length > 0 ? (
          <div className="mt-4 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-3">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[color:var(--vd-muted)]">
              {allCodesKnown
                ? "Alle Kürzel bekannt"
                : missingCodes.length > 0
                  ? "Noch scannen"
                  : "Kürzel aus der Fahrzeugtabelle"}
            </p>
            <p className="mt-1.5 text-[0.82rem] leading-relaxed text-[color:var(--vd-text)]">
              {allCodesKnown
                ? "Alle Auflagen-Texte sind vorhanden — du kannst direkt zur Prüfung."
                : missingCodes.length > 0
                  ? `Fotografiere noch: ${missingCodes.join(", ")}`
                  : "Grün = aus Kürzel-Datenbank, Amber = noch scannen."}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {targetCodes.map((code) => {
                const fromDb = dbResolvedSet.has(code.toUpperCase());
                const captured = !missingCodes.some(
                  (missing) => missing.toUpperCase() === code.toUpperCase(),
                );
                return (
                  <span
                    key={code}
                    className={`rounded-full border px-2.5 py-0.5 font-mono text-[0.78rem] font-semibold ${
                      captured
                        ? fromDb
                          ? "border-sky-300/70 bg-sky-500/15 text-sky-950"
                          : "border-emerald-300/70 bg-emerald-500/15 text-emerald-950"
                        : "border-amber-300/70 bg-amber-500/15 text-amber-950"
                    }`}
                  >
                    {code}
                  </span>
                );
              })}
            </div>
          </div>
        ) : vehicleSelectionReady ? null : (
          <p className="mt-4 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-[0.82rem] text-amber-950">
            Bitte wähle zuerst deine Fahrzeugzeile in der Tabelle — danach
            erscheinen hier die Auflagen-Kürzel zum Scannen.
          </p>
        )}

        {allCodesKnown ? (
          <Button
            type="button"
            className="mt-5 h-12 w-full"
            onClick={onContinueToReview}
          >
            Weiter zur Prüfung
          </Button>
        ) : (
          <Button
            type="button"
            className="mt-5 h-12 w-full"
            disabled={!vehicleSelectionReady || targetCodes.length === 0}
            onClick={onStartScan}
          >
            <Camera className="h-4 w-4" />
            {missingCodes.length > 0
              ? `Fehlende Auflagen scannen (${missingCodes.length})`
              : "Auflagen scannen"}
          </Button>
        )}
      </section>
    </section>
  );
}

function HuntEntryChooser({
  vehicleLabel,
  onBack,
  onChooseCamera,
  onChoosePdf,
}: {
  vehicleLabel: string;
  onBack: () => void;
  onChooseCamera: () => void;
  onChoosePdf: (file: File) => void;
}) {
  const pdfInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-4 py-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1.5 text-[0.82rem] font-medium text-[color:var(--vd-muted)]"
      >
        Zurück
      </button>

      <header className="mt-6">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
          ABE erfassen
        </p>
        <h1 className="mt-2 text-[1.35rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
          Wie möchtest du starten?
        </h1>
        <p className="mt-2 text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
          {vehicleLabel} · Fotografiere fehlende Angaben nacheinander oder lade
          ein komplettes PDF hoch.
        </p>
      </header>

      <div className="mt-10 grid gap-3">
        <Button
          type="button"
          className="h-14 justify-center gap-2 text-[0.95rem]"
          onClick={onChooseCamera}
        >
          <Camera className="h-5 w-5" />
          Fotografieren
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-14 justify-center gap-2 text-[0.95rem]"
          onClick={() => pdfInputRef.current?.click()}
        >
          <FileUp className="h-5 w-5" />
          PDF hochladen
        </Button>
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onChoosePdf(file);
            event.target.value = "";
          }}
        />
      </div>
    </section>
  );
}

// ─── Review ────────────────────────────────────────────────────────────────────

function ReviewPanel({
  report,
  vehicleLabel,
  vehicleContext,
  selectedGroupIndex,
  selectedRowId,
  onSelectGroup,
  onSelectRow,
  onSave,
  onRestart,
  isSaving,
  saveError,
}: {
  report: AbeDataHunterReport;
  vehicleLabel: string;
  vehicleContext?: AbeVehicleContext | null;
  selectedGroupIndex: number | null;
  selectedRowId: string | null;
  onSelectGroup: (index: number) => void;
  onSelectRow: (rowId: string) => void;
  onSave: (form: ReviewFormState) => void;
  onRestart: () => void;
  isSaving: boolean;
  saveError: string | null;
}) {
  const groups = useMemo(
    () => groupAbeVehicleMatches(report.vehicleMatches),
    [report.vehicleMatches],
  );
  const selectedGroup = selectedAbeVehicleGroup(report, selectedGroupIndex);
  const selectedVerkaufsbezeichnung = selectedGroup?.verkaufsbezeichnung ?? null;
  const scopedAuflagen = auflagenForUserVehicleSelection(
    report,
    selectedGroupIndex,
    selectedRowId,
  );

  const [form, setForm] = useState<ReviewFormState>(() => ({
    kbaNumber: report.kbaNumber ?? "",
    abeNumber: report.abeNumber ?? "",
    abeHolder: report.abeHolder ?? "",
    manufacturer: report.manufacturer ?? "",
    partDesignation: report.partDesignation ?? "",
    markingText: report.markingText ?? "",
    auflagenCodes: scopedAuflagen.join(" "),
    auflagenNotes: report.auflagenNotes ?? "",
  }));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const next = scopedAuflagen.join(" ");
    setForm((prev) =>
      prev.auflagenCodes === next ? prev : { ...prev, auflagenCodes: next },
    );
  }, [scopedAuflagen.join(" ")]);

  const draftReport: AbeDataHunterReport = {
    ...report,
    kbaNumber: form.kbaNumber.trim() || null,
    abeNumber: form.abeNumber.trim() || null,
    abeHolder: form.abeHolder.trim() || null,
    manufacturer: form.manufacturer.trim() || null,
    partDesignation: form.partDesignation.trim() || null,
    markingText: form.markingText.trim() || null,
    auflagenCodes: parseCodes(form.auflagenCodes),
    auflagenNotes: form.auflagenNotes.trim() || null,
  };
  const missing = missingAbeRequiredFields(
    draftReport,
    selectedVerkaufsbezeichnung,
    vehicleContext,
    { selectedGroupIndex, selectedRowId },
  );

  return (
    <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-4 px-4 py-6">
      {groups.length > 0 ? (
        <AbeVehicleMatchPicker
          matches={report.vehicleMatches}
          selectedGroupIndex={selectedGroupIndex}
          onSelectGroup={onSelectGroup}
          selectedRowId={selectedRowId}
          onSelectRow={onSelectRow}
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
              <AbeFieldLabel label={`${ABE_REQUIRED_FIELD_LABELS.abeHolder} *`}>
                <Input
                  value={form.abeHolder}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, abeHolder: e.target.value }))
                  }
                />
              </AbeFieldLabel>
              <AbeFieldLabel label={`${ABE_REQUIRED_FIELD_LABELS.manufacturer} *`}>
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
              <AbeFieldLabel label="Kennzeichnung (optional)">
                <textarea
                  value={form.markingText}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      markingText: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Nur falls auf der ABE angegeben — wo/wie das Bauteil gekennzeichnet ist."
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
              <AbeFieldLabel label={`${ABE_REQUIRED_FIELD_LABELS.auflagenNotes} *`}>
                <textarea
                  value={form.auflagenNotes}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      auflagenNotes: e.target.value,
                    }))
                  }
                  rows={6}
                  className="flex w-full rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5 text-[0.92rem] outline-none"
                />
              </AbeFieldLabel>
            </div>
          ) : (
            <dl className="grid gap-2.5">
              <AbeSummaryRow label="Nummer der ABE" value={form.abeNumber} />
              <AbeSummaryRow label={ABE_REQUIRED_FIELD_LABELS.abeHolder} value={form.abeHolder} />
              <AbeSummaryRow label={ABE_REQUIRED_FIELD_LABELS.manufacturer} value={form.manufacturer} />
              <AbeSummaryRow
                label="Bezeichnung des Bauteils"
                value={form.partDesignation}
              />
              <AbeSummaryRow
                label="Kennzeichnung (optional)"
                value={form.markingText || "—"}
              />
              <AbeSummaryRow
                label={ABE_VEHICLE_MODEL_DISPLAY_LABEL}
                value={selectedVerkaufsbezeichnung}
              />
              <AbeSummaryRow label="Auflagen" value={form.auflagenCodes} />
              <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] px-3 py-2.5">
                <p className="text-[0.78rem] text-[color:var(--vd-muted)]">
                  {ABE_REQUIRED_FIELD_LABELS.auflagenNotes}
                </p>
                <div className="mt-2">
                  <AbeAuflagenFoldList
                    notes={form.auflagenNotes}
                    knownCodes={scopedAuflagen}
                    defaultOpenFirst
                  />
                </div>
              </div>
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
  const [phase, setPhase] = useState<WizardPhase>("choose");
  const [huntMode, setHuntMode] = useState<HuntMode | null>(null);
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
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [huntSessionKey, setHuntSessionKey] = useState(0);
  const [manualKbaInput, setManualKbaInput] = useState("");
  const [kuerzelDbReady, setKuerzelDbReady] = useState(false);

  const queueRef = useRef<File[]>([]);
  const auflagenQueueRef = useRef<File[]>([]);
  const drainingRef = useRef(false);
  const auflagenDrainingRef = useRef(false);
  const queueModeRef = useRef<"kba" | "all">("kba");
  const reportRef = useRef(report);
  reportRef.current = report;
  const selectedGroupIndexRef = useRef(selectedGroupIndex);
  selectedGroupIndexRef.current = selectedGroupIndex;
  const cameraGuideKeyRef = useRef<AbeRequiredFieldKey>("kbaNumber");
  const kuerzelDbRef = useRef<Map<string, string>>(buildClientAuflagenKuerzelDb());

  const huntGroup = huntGroupContext(
    report,
    selectedGroupIndex,
    vehicleContext,
  );
  const huntSelectedVerkaufsbezeichnung = huntGroup.verkaufsbezeichnung;

  const coreComplete = isAbeCoreHuntComplete(
    report,
    phase === "hunt" || phase === "kba-hunt"
      ? null
      : huntSelectedVerkaufsbezeichnung,
    vehicleContext,
  );
  const targetAuflagenCodes = useMemo(
    () =>
      auflagenForUserVehicleSelection(
        report,
        selectedGroupIndex,
        selectedRowId,
      ),
    [report, selectedGroupIndex, selectedRowId],
  );
  const missingAuflagenAfterDb = useMemo(() => {
    if (!kuerzelDbReady) return targetAuflagenCodes;
    const augmented = augmentAuflagenNotesWithKuerzelDb(
      report.auflagenNotes,
      targetAuflagenCodes,
      kuerzelDbRef.current,
    );
    return missingAuflagenCodesInNotes(augmented, targetAuflagenCodes);
  }, [kuerzelDbReady, report.auflagenNotes, targetAuflagenCodes]);
  const dbResolvedAuflagenCodes = useMemo(() => {
    if (!kuerzelDbReady) return [];
    const missingSet = new Set(
      missingAuflagenAfterDb.map((code) => code.toUpperCase()),
    );
    return targetAuflagenCodes.filter((code) => {
      const normalized = code.toUpperCase();
      return kuerzelDbRef.current.has(normalized) && !missingSet.has(normalized);
    });
  }, [
    kuerzelDbReady,
    missingAuflagenAfterDb,
    targetAuflagenCodes,
  ]);
  const captureSummary = sourcePdf
    ? "PDF"
    : photos.length > 0
      ? `${photos.length} Foto${photos.length === 1 ? "" : "s"}`
      : null;

  useEffect(() => {
    let cancelled = false;

    async function loadKuerzelDb() {
      const localDb = buildClientAuflagenKuerzelDb();
      kuerzelDbRef.current = localDb;

      try {
        const serverRecords = await fetchServerAuflagenKuerzelRecords();
        if (!cancelled) {
          kuerzelDbRef.current = buildClientAuflagenKuerzelDb(serverRecords);
        }
      } catch {
        if (!cancelled) {
          kuerzelDbRef.current = localDb;
        }
      }

      if (!cancelled) {
        setKuerzelDbReady(true);
      }
    }

    void loadKuerzelDb();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!kuerzelDbReady) return;
    if (
      phase !== "auflagen-detail" &&
      phase !== "auflagen-scan" &&
      phase !== "review"
    ) {
      return;
    }

    const codes = auflagenForUserVehicleSelection(
      report,
      selectedGroupIndex,
      selectedRowId,
    );
    if (codes.length === 0) return;

    const augmented = augmentAuflagenNotesWithKuerzelDb(
      report.auflagenNotes,
      codes,
      kuerzelDbRef.current,
    );
    if (augmented === report.auflagenNotes) return;

    setReport((prev) => {
      const next = { ...prev, auflagenNotes: augmented };
      reportRef.current = next;
      return next;
    });
  }, [
    kuerzelDbReady,
    phase,
    report.auflagenNotes,
    report.vehicleMatches,
    selectedGroupIndex,
    selectedRowId,
  ]);

  useEffect(() => {
    if (
      phase !== "review" &&
      phase !== "auflagen-detail" &&
      phase !== "auflagen-scan"
    ) {
      return;
    }

    setReport((prev) => {
      const codes = auflagenForUserVehicleSelection(
        prev,
        selectedGroupIndex,
        selectedRowId,
      );
      if (codes.join("|") === prev.auflagenCodes.join("|")) {
        return prev;
      }
      const next = { ...prev, auflagenCodes: codes };
      reportRef.current = next;
      return next;
    });
  }, [phase, report.vehicleMatches, selectedGroupIndex, selectedRowId]);

  useEffect(() => {
    if (phase !== "auflagen-detail" && phase !== "review") return;
    const groups = groupAbeVehicleMatches(report.vehicleMatches);
    if (groups.length === 1 && selectedGroupIndex === null) {
      setSelectedGroupIndex(0);
    }
  }, [phase, report.vehicleMatches, selectedGroupIndex]);

  useEffect(() => {
    if (phase !== "auflagen-detail" && phase !== "review") return;
    const group = selectedAbeVehicleGroup(report, selectedGroupIndex);
    if (!group) return;
    if (group.rows.length === 1) {
      setSelectedRowId((current) => current ?? defaultAbeRowIdForGroup(group));
    }
  }, [phase, report.vehicleMatches, selectedGroupIndex]);

  function handleSelectGroup(index: number) {
    setSelectedGroupIndex(index);
    const groups = groupAbeVehicleMatches(report.vehicleMatches);
    const group = groups[index] ?? null;
    setSelectedRowId(group ? defaultAbeRowIdForGroup(group) : null);
  }

  function handleSelectRow(rowId: string) {
    setSelectedRowId(rowId);
  }

  function goBack() {
    if (onBack) onBack();
    else if (backHref) window.location.href = backHref;
  }

  function returnToAuflagenDetail() {
    auflagenQueueRef.current = [];
    auflagenDrainingRef.current = false;
    setQueuedCount(0);
    setAnalyzing(false);
    setPhase("auflagen-detail");
  }

  function startAuflagenScan() {
    setHuntError(null);
    setPhase("auflagen-scan");
  }

  function goToReview() {
    setPhase("review");
  }

  function returnToChooser() {
    queueRef.current = [];
    auflagenQueueRef.current = [];
    drainingRef.current = false;
    auflagenDrainingRef.current = false;
    setHuntMode(null);
    setPhase("choose");
  }

  function applyManualKbaInput(raw: string) {
    const digits = normalizeAbeKbaDigits(raw);
    if (!digits) return;
    setReport((prev) => {
      const next = finalizeAbeDataHunterReport({
        ...prev,
        kbaNumber: digits,
        abeNumber: prev.abeNumber ?? digits,
      });
      reportRef.current = next;
      return next;
    });
    setHuntError(null);
  }

  function handleManualKbaChange(value: string) {
    setManualKbaInput(value);
    applyManualKbaInput(value);
  }

  function startMainHuntFromKba() {
    if (!reportKbaDigits(reportRef.current)) {
      setHuntError("Bitte zuerst eine gültige KBA-Nummer eingeben oder fotografieren.");
      return;
    }
    queueModeRef.current = "all";
    setHuntError(null);
    setLastFound([]);
    setHuntSessionKey((current) => current + 1);
    setPhase("hunt");
    if (huntMode === "pdf" && sourcePdf) {
      enqueueFile(sourcePdf);
    }
  }

  function startCameraHunt() {
    setLastFound([]);
    setManualKbaInput("");
    setHuntSessionKey((current) => current + 1);
    cameraGuideKeyRef.current = "kbaNumber";
    queueModeRef.current = "kba";
    setHuntMode("camera");
    setPhase("kba-hunt");
  }

  function startPdfHunt(file: File) {
    if (!isPdfFile(file)) {
      setHuntError("Bitte eine PDF-Datei wählen.");
      return;
    }
    setManualKbaInput("");
    setHuntMode("pdf");
    setSourcePdf(file);
    setHuntSessionKey((current) => current + 1);
    queueModeRef.current = "kba";
    setPhase("kba-hunt");
    enqueueFile(file);
  }

  function restart() {
    queueRef.current = [];
    auflagenQueueRef.current = [];
    drainingRef.current = false;
    auflagenDrainingRef.current = false;
    setPhase("choose");
    setHuntMode(null);
    setReport(emptyAbeDataHunterReport());
    setPhotos([]);
    setSourcePdf(null);
    setLastFound([]);
    setHuntError(null);
    setQueuedCount(0);
    setAnalyzing(false);
    setAnalyzingPdf(false);
    setSelectedGroupIndex(null);
    setSelectedRowId(null);
    setSaveError(null);
    setManualKbaInput("");
    setHuntSessionKey((current) => current + 1);
  }

  function openAuflagenDetailFromHunt() {
    const groups = groupAbeVehicleMatches(report.vehicleMatches);
    if (groups.length === 1) {
      setSelectedGroupIndex(0);
      setSelectedRowId(defaultAbeRowIdForGroup(groups[0]!));
    } else {
      setSelectedGroupIndex(null);
      setSelectedRowId(null);
    }
    setPhase("auflagen-detail");
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
        const before = reportRef.current;

        if (queueModeRef.current === "kba") {
          const extracted = await extractKbaFromFile(file);
          const merged = fillAbeDataHunterReport(before, extracted);
          reportRef.current = merged;
          setReport(merged);
          const kba = reportKbaDigits(merged);
          if (kba) {
            setManualKbaInput(kba);
            setHuntError(null);
            setLastFound([ABE_REQUIRED_FIELD_LABELS.kbaNumber]);
          } else {
            setHuntError(
              "KBA-Nummer nicht erkannt — bitte näher heran, erneut fotografieren oder manuell eintragen.",
            );
          }
          continue;
        }

        const groupIndex = selectedGroupIndexRef.current;
        const beforeContext = enrichAfterHuntMerge(
          before,
          groupIndex,
          vehicleContext,
        );
        const focusKey =
          CORE_HUNT_ORDER[
            firstMissingFocusIndex(
              beforeContext.report,
              null,
              vehicleContext,
            )
          ] ?? "kbaNumber";

        const extracted = await extractForHuntFocus(file, focusKey);
        const mergedRaw = fillAbeDataHunterReport(before, extracted);
        const {
          report: merged,
          groupIndex: resolvedGroupIndex,
        } = enrichAfterHuntMerge(mergedRaw, groupIndex, vehicleContext);

        if (resolvedGroupIndex !== selectedGroupIndexRef.current) {
          selectedGroupIndexRef.current = resolvedGroupIndex;
          setSelectedGroupIndex(resolvedGroupIndex);
        }
        const found = newlyFilledLabels(
          beforeContext.report,
          merged,
          null,
          vehicleContext,
        );
        const filledKeys = CORE_HUNT_ORDER.filter((key) => {
          const beforeMissing = missingCoreHuntFieldSet(
            beforeContext.report,
            null,
            vehicleContext,
          );
          const afterMissing = missingCoreHuntFieldSet(
            merged,
            null,
            vehicleContext,
          );
          return beforeMissing.has(key) && !afterMissing.has(key);
        });

        reportRef.current = merged;
        setReport(merged);
        setLastFound(found);
        if (filledKeys.length > 0) {
          setHuntError(null);
        } else if (!isAbeCoreHuntComplete(merged, null, vehicleContext)) {
          setHuntError(
            `${ABE_REQUIRED_FIELD_LABELS[focusKey]} nicht erkannt — bitte näher heran oder erneut fotografieren.`,
          );
        }

        if (isAbeCoreHuntComplete(merged, null, vehicleContext)) {
          queueRef.current = [];
          setQueuedCount(0);
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

  async function drainAuflagenQueue() {
    if (auflagenDrainingRef.current) return;
    auflagenDrainingRef.current = true;
    setAnalyzing(true);

    while (auflagenQueueRef.current.length > 0) {
      const file = auflagenQueueRef.current.shift()!;
      setQueuedCount(auflagenQueueRef.current.length);

      try {
        const codes = auflagenForUserVehicleSelection(
          reportRef.current,
          selectedGroupIndex,
          selectedRowId,
        );
        const notes = await extractAuflagenTextFromFile(file, codes);
        const before = reportRef.current;
        const merged = fillAbeDataHunterReport(before, {
          ...emptyAbeDataHunterReport(),
          auflagenNotes: notes,
        });

        const learned = extractKuerzelRecordsFromOcrNotes(notes, codes);
        if (learned.length > 0) {
          kuerzelDbRef.current = await learnAuflagenKuerzelRecords(
            learned,
            kuerzelDbRef.current,
          );
        }

        const enriched = augmentAuflagenNotesWithKuerzelDb(
          merged.auflagenNotes,
          codes,
          kuerzelDbRef.current,
        );
        const finalReport =
          enriched === merged.auflagenNotes
            ? merged
            : { ...merged, auflagenNotes: enriched };

        reportRef.current = finalReport;
        setReport(finalReport);
        setLastFound([ABE_REQUIRED_FIELD_LABELS.auflagenNotes]);
        setHuntError(null);

        if (
          isAbeDataHunterReportComplete(
            finalReport,
            selectedVerkaufsbezeichnungForReport(
              finalReport,
              selectedGroupIndex,
              vehicleContext,
            ),
            vehicleContext,
            { selectedGroupIndex, selectedRowId },
          )
        ) {
          auflagenQueueRef.current = [];
          setQueuedCount(0);
          window.setTimeout(() => goToReview(), 400);
          break;
        }
      } catch (err) {
        setHuntError(
          err instanceof Error ? err.message : "Auflagen-Text fehlgeschlagen.",
        );
      }
    }

    auflagenDrainingRef.current = false;
    setAnalyzing(false);
    setQueuedCount(0);
  }

  function enqueueAuflagenFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setHuntError("Bitte ein Foto wählen.");
      return;
    }

    setHuntError(null);
    setPhotos((prev) => [...prev, file]);
    auflagenQueueRef.current.push(file);
    setQueuedCount(auflagenQueueRef.current.length);
    void drainAuflagenQueue();
  }

  function enqueueFile(file: File) {
    if (!isPdfFile(file) && !file.type.startsWith("image/")) {
      setHuntError("Bitte ein Foto oder PDF wählen.");
      return;
    }

    setHuntError(null);
    setLastFound([]);

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
    const selectedGroup = selectedAbeVehicleGroup(report, selectedGroupIndex);

    const draft: AbeDataHunterReport = {
      ...report,
      kbaNumber: normalizeAbeKbaDigits(reviewForm.kbaNumber.trim()) || null,
      abeNumber: normalizeAbeNumberDigits(reviewForm.abeNumber.trim()) || null,
      abeHolder: reviewForm.abeHolder.trim() || null,
      manufacturer: reviewForm.manufacturer.trim() || null,
      partDesignation: reviewForm.partDesignation.trim() || null,
      markingText: reviewForm.markingText.trim() || null,
      auflagenCodes: parseCodes(reviewForm.auflagenCodes),
      auflagenNotes: reviewForm.auflagenNotes.trim() || null,
    };

    const stillMissing = missingAbeRequiredFields(
      draft,
      selectedGroup?.verkaufsbezeichnung,
      vehicleContext,
      { selectedGroupIndex, selectedRowId },
    );
    if (stillMissing.length > 0) {
      setSaveError(
        `Pflichtfelder fehlen: ${stillMissing
          .map((key) => ABE_REQUIRED_FIELD_LABELS[key])
          .join(", ")}.`,
      );
      return;
    }

    const knownAuflagenCodes = auflagenForUserVehicleSelection(
      draft,
      selectedGroupIndex,
      selectedRowId,
    );
    const parsedConditions = abeAuflagenConditionsFromNotes(
      draft.auflagenNotes,
      knownAuflagenCodes,
    );
    const conditions =
      parsedConditions.length > 0
        ? parsedConditions
        : knownAuflagenCodes.length > 0
          ? knownAuflagenCodes
          : draft.auflagenCodes;
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
              ? selectedVerkaufsbezeichnungPayload(
                  selectedGroup,
                  vehicleContext,
                  selectedRowId,
                )
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

  const errorBanner =
    huntError && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed bottom-4 left-4 right-4 z-[10060] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.82rem] text-red-800 shadow-lg">
            {huntError}
          </div>,
          document.body,
        )
      : null;

  if (phase === "review") {
    return (
      <ReviewPanel
        report={report}
        vehicleLabel={vehicleLabel}
        vehicleContext={vehicleContext}
        selectedGroupIndex={selectedGroupIndex}
        selectedRowId={selectedRowId}
        onSelectGroup={handleSelectGroup}
        onSelectRow={handleSelectRow}
        onSave={handleSave}
        onRestart={restart}
        isSaving={isSaving}
        saveError={saveError}
      />
    );
  }

  if (phase === "choose") {
    return (
      <>
        {huntError ? (
          <div className="fixed bottom-4 left-4 right-4 z-[10060] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.82rem] text-red-800 shadow-lg">
            {huntError}
          </div>
        ) : null}
        <HuntEntryChooser
          vehicleLabel={vehicleLabel}
          onBack={goBack}
          onChooseCamera={startCameraHunt}
          onChoosePdf={startPdfHunt}
        />
      </>
    );
  }

  if (phase === "auflagen-detail") {
    return (
      <>
        {errorBanner}
        <AuflagenDetailPanel
          report={report}
          vehicleLabel={vehicleLabel}
          vehicleContext={vehicleContext}
          selectedGroupIndex={selectedGroupIndex}
          selectedRowId={selectedRowId}
          dbResolvedCodes={dbResolvedAuflagenCodes}
          missingCodes={missingAuflagenAfterDb}
          onSelectGroup={handleSelectGroup}
          onSelectRow={handleSelectRow}
          onContinueToReview={goToReview}
          onStartScan={startAuflagenScan}
          onBack={returnToChooser}
        />
      </>
    );
  }

  if (phase === "auflagen-scan") {
    return (
      <>
        {errorBanner}
        <AuflagenScanOverlay
          targetCodes={targetAuflagenCodes}
          auflagenNotes={report.auflagenNotes}
          analyzing={analyzing}
          queuedCount={queuedCount}
          captureSummary={captureSummary}
          onOpenReview={goToReview}
          onClose={returnToAuflagenDetail}
        />
        <InBrowserCamera
          title="Auflagen scannen"
          hint="Fotografiere den Auflagen-Text zu den Nummern oben."
          guideWatermark={ABE_HUNT_FIELD_WATERMARKS.auflagenNotes}
          guideFrame="a4"
          allowPdf={false}
          showBriefing={false}
          continuousCapture
          onCapture={enqueueAuflagenFile}
          onClose={returnToAuflagenDetail}
        />
      </>
    );
  }

  if (phase === "kba-hunt") {
    const kbaOverlay = (
      <KbaHuntOverlay
        key={huntSessionKey}
        report={report}
        manualValue={manualKbaInput}
        analyzing={analyzing}
        analyzingPdf={analyzingPdf}
        queuedCount={queuedCount}
        captureSummary={captureSummary}
        onManualChange={handleManualKbaChange}
        onContinue={startMainHuntFromKba}
        onClose={returnToChooser}
      />
    );

    if (huntMode === "pdf") {
      return (
        <>
          {errorBanner}
          <div className="fixed inset-0 bg-neutral-950" aria-hidden />
          {kbaOverlay}
        </>
      );
    }

    return (
      <>
        {errorBanner}
        {kbaOverlay}
        <InBrowserCamera
          title="KBA-Nummer scannen"
          hint="Halte „Gutachten zur ABE Nr.“ oder „KBA-Nummer“ gut lesbar ins Rechteck."
          guideWatermark={ABE_HUNT_FIELD_WATERMARKS.kbaNumber}
          guideFrame="a4"
          allowPdf={false}
          showBriefing={false}
          continuousCapture
          onCapture={enqueueFile}
          onClose={returnToChooser}
        />
      </>
    );
  }

  if (phase !== "hunt") {
    return null;
  }

  const progressOverlay = (
    <HuntProgressOverlay
      key={huntSessionKey}
      report={report}
      analyzing={analyzing}
      analyzingPdf={analyzingPdf}
      queuedCount={queuedCount}
      captureSummary={captureSummary}
      lastFound={lastFound}
      onOpenReview={openAuflagenDetailFromHunt}
      onClose={returnToChooser}
      vehicleContext={vehicleContext}
    />
  );

  const huntFocusKey = coreComplete
    ? "verkaufsbezeichnung"
    : firstMissingFocusKey(report, null, vehicleContext);

  if (!analyzing && !coreComplete) {
    cameraGuideKeyRef.current = huntFocusKey;
  }

  const cameraGuideKey = coreComplete ? huntFocusKey : cameraGuideKeyRef.current;
  const guideWatermark = coreComplete
    ? undefined
    : ABE_HUNT_FIELD_WATERMARKS[cameraGuideKey];
  const activeScanHintText = analyzing
    ? "Foto wird ausgewertet — bitte kurz warten."
    : "Fotografiere sichtbare Abschnitte — mehrere Felder pro Foto sind möglich.";

  const switchToCameraButton =
    huntMode === "pdf" &&
    !coreComplete &&
    !analyzing &&
    typeof document !== "undefined"
      ? createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[10050] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => {
                setHuntMode("camera");
                setLastFound([]);
              }}
              className="pointer-events-auto mx-auto flex w-full max-w-[440px] items-center justify-center gap-2 rounded-2xl border border-white/20 bg-black/70 px-4 py-3.5 text-[0.88rem] font-semibold text-white backdrop-blur-md"
            >
              <Camera className="h-4 w-4" />
              Fehlende Angaben fotografieren
            </button>
          </div>,
          document.body,
        )
      : null;

  if (huntMode === "pdf") {
    return (
      <>
        {errorBanner}
        <div className="fixed inset-0 bg-neutral-950" aria-hidden />
        {progressOverlay}
        {switchToCameraButton}
      </>
    );
  }

  return (
    <>
      {errorBanner}
      {progressOverlay}
      <InBrowserCamera
        title="ABE scannen"
        hint={activeScanHintText}
        guideWatermark={guideWatermark}
        guideFrame="a4"
        allowPdf={false}
        showBriefing={false}
        continuousCapture
        onCapture={enqueueFile}
        onClose={returnToChooser}
      />
    </>
  );
}
