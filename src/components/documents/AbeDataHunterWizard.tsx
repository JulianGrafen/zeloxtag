"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Check,
  FileUp,
  LoaderCircle,
  Pencil,
  RotateCcw,
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
  mergeAbeDataHunterSteps,
  missingAbeRequiredFields,
  type AbeDataHunterReport,
  type AbeDataHunterStep,
  type AbeHuntAuflagenExtraction,
  type AbeHuntMarkingExtraction,
  type AbeHuntStammdatenExtraction,
  type AbeHuntVehicleExtraction,
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

const NEXT_HINT: Record<AbeRequiredFieldKey, string> = {
  kbaNumber: "Finde und fotografiere die KBA-Nummer.",
  abeNumber: "Finde und fotografiere die Nummer der ABE.",
  abeHolder: "Finde und fotografiere den Inhaber der ABE.",
  manufacturer: "Finde und fotografiere den Hersteller.",
  partDesignation: "Finde und fotografiere die Bezeichnung des Bauteils.",
  markingText:
    "Finde und fotografiere die Kennzeichnung (wo/wie die KBA am Bauteil steht).",
  verkaufsbezeichnung:
    "Finde und fotografiere die Fahrzeugtabelle mit der Verkaufsbezeichnung.",
  auflagenCodes:
    "Finde und fotografiere die Auflagen-Kürzel zu deinem Fahrzeug.",
};

// ─── API ───────────────────────────────────────────────────────────────────────

class HuntApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HuntApiError";
  }
}

async function callHuntStep<T>(
  file: File,
  step: AbeDataHunterStep,
): Promise<T> {
  const body = new FormData();
  body.set("file", file);
  body.set("step", `hunt-${step}`);

  const response = await fetch("/api/ocr/abe", { method: "POST", body });
  const payload = (await response.json().catch(() => null)) as
    | { ok: true; extraction: T }
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

async function extractEverythingFromFile(
  file: File,
): Promise<AbeDataHunterReport> {
  const [stammdaten, marking, vehicle, auflagen] = await Promise.all([
    callHuntStep<AbeHuntStammdatenExtraction>(file, "stammdaten"),
    callHuntStep<AbeHuntMarkingExtraction>(file, "marking"),
    callHuntStep<AbeHuntVehicleExtraction>(file, "vehicle"),
    callHuntStep<AbeHuntAuflagenExtraction>(file, "auflagen"),
  ]);
  return mergeAbeDataHunterSteps(stammdaten, marking, vehicle, auflagen);
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

// ─── Progress overlay ──────────────────────────────────────────────────────────

function HuntProgressOverlay({
  report,
  analyzing,
  lastFound,
  onOpenReview,
  onUploadPdf,
}: {
  report: AbeDataHunterReport;
  analyzing: boolean;
  lastFound: string[];
  onOpenReview: () => void;
  onUploadPdf: (file: File) => void;
}) {
  const missing = missingAbeRequiredFields(report);
  const filledCount = REQUIRED_ORDER.length - missing.length;
  const nextMissing = missing[0];
  const complete = missing.length === 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[10000] px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="pointer-events-auto mx-auto max-w-[440px] rounded-2xl border border-white/15 bg-black/70 px-3 py-3 text-white shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/70">
            {filledCount} / {REQUIRED_ORDER.length} erfasst
          </p>
          {analyzing ? (
            <span className="inline-flex items-center gap-1.5 text-[0.72rem] text-white/80">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Analysiert…
            </span>
          ) : null}
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-300"
            style={{
              width: `${(filledCount / REQUIRED_ORDER.length) * 100}%`,
            }}
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {REQUIRED_ORDER.map((key) => {
            const done = !missing.includes(key);
            return (
              <span
                key={key}
                className={[
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.62rem] font-medium",
                  done
                    ? "bg-emerald-500/25 text-emerald-100"
                    : "bg-white/10 text-white/65",
                ].join(" ")}
              >
                {done ? <Check className="h-3 w-3" /> : null}
                {ABE_REQUIRED_FIELD_LABELS[key]}
              </span>
            );
          })}
        </div>

        {lastFound.length > 0 && !analyzing ? (
          <p className="mt-2 text-[0.75rem] text-emerald-200">
            Neu: {lastFound.join(" · ")}
          </p>
        ) : null}

        <p className="mt-2 text-[0.84rem] font-medium leading-snug text-white">
          {complete
            ? "Alles erfasst — zur Prüfung."
            : nextMissing
              ? NEXT_HINT[nextMissing]
              : "Fotografiere die fehlenden Angaben."}
        </p>

        <div className="mt-3 flex gap-2">
          <label className="relative inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-[0.78rem] font-semibold">
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="absolute inset-0 cursor-pointer opacity-0"
              disabled={analyzing}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUploadPdf(file);
                event.target.value = "";
              }}
            />
            <FileUp className="h-3.5 w-3.5" />
            PDF
          </label>
          <button
            type="button"
            disabled={!complete || analyzing}
            onClick={onOpenReview}
            className="flex-[2] rounded-xl bg-white px-3 py-2.5 text-[0.78rem] font-semibold text-neutral-900 disabled:opacity-40"
          >
            Zur Prüfung
          </button>
        </div>
      </div>
    </div>
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
  const [report, setReport] = useState<AbeDataHunterReport>(
    emptyAbeDataHunterReport,
  );
  const [photos, setPhotos] = useState<File[]>([]);
  const [sourcePdf, setSourcePdf] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastFound, setLastFound] = useState<string[]>([]);
  const [huntError, setHuntError] = useState<string | null>(null);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(
    null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  const missing = missingAbeRequiredFields(report);
  const nextMissing = missing[0];
  const complete = isAbeDataHunterReportComplete(report);

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
    setPhase("hunt");
    setReport(emptyAbeDataHunterReport());
    setPhotos([]);
    setSourcePdf(null);
    setLastFound([]);
    setHuntError(null);
    setSelectedGroupIndex(null);
    setSaveError(null);
  }

  async function ingestFile(file: File) {
    if (analyzing) return;
    setAnalyzing(true);
    setHuntError(null);
    setLastFound([]);

    try {
      const extracted = await extractEverythingFromFile(file);
      const beforeMissing = new Set(missingAbeRequiredFields(report));
      const merged = fillAbeDataHunterReport(report, extracted);
      const afterMissing = new Set(missingAbeRequiredFields(merged));
      const newlyFilled = REQUIRED_ORDER.filter(
        (key) => beforeMissing.has(key) && !afterMissing.has(key),
      ).map((key) => ABE_REQUIRED_FIELD_LABELS[key]);

      setReport(merged);
      setLastFound(newlyFilled);

      if (isPdfFile(file)) {
        setSourcePdf(file);
      } else {
        setPhotos((prev) => [...prev, file]);
      }

      if (isAbeDataHunterReportComplete(merged)) {
        const groups = groupAbeVehicleMatches(merged.vehicleMatches);
        setSelectedGroupIndex(resolveInitialAbeVehicleGroupIndex(groups));
        window.setTimeout(() => setPhase("review"), 450);
      }
    } catch (err) {
      setHuntError(
        err instanceof Error ? err.message : "Analyse fehlgeschlagen.",
      );
    } finally {
      setAnalyzing(false);
    }
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

  return (
    <>
      {huntError ? (
        <div className="fixed bottom-4 left-4 right-4 z-[10001] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.82rem] text-red-800 shadow-lg">
          {huntError}
        </div>
      ) : null}

      <HuntProgressOverlay
        report={report}
        analyzing={analyzing}
        lastFound={lastFound}
        onOpenReview={() => setPhase("review")}
        onUploadPdf={(file) => void ingestFile(file)}
      />

      <InBrowserCamera
        title="ABE scannen"
        hint={
          nextMissing
            ? NEXT_HINT[nextMissing]
            : "Alles erfasst — tippe auf Zur Prüfung."
        }
        guideLabel="Fotografiere fehlende Angaben"
        guideFrame="a4"
        allowPdf
        showBriefing={false}
        continuousCapture
        onCapture={(file) => void ingestFile(file)}
        onClose={goBack}
      />
    </>
  );
}
