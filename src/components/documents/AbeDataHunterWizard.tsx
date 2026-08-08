"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  Pencil,
  RotateCcw,
} from "lucide-react";

import { ImageCropCapture } from "@/components/documents/image-crop-capture";
import { AbeVehicleMatchPicker } from "@/components/documents/abe-vehicle-match-picker";
import {
  AbeFieldLabel,
  AbeKbaHero,
  AbeSummaryRow,
} from "@/components/documents/abe-review-ui";
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
  isAbeHuntAuflagenComplete,
  isAbeHuntMarkingComplete,
  isAbeHuntStammdatenComplete,
  isAbeHuntVehicleComplete,
  mergeAbeDataHunterSteps,
  missingAbeRequiredFields,
  type AbeDataHunterReport,
  type AbeDataHunterStep,
  type AbeHuntAuflagenExtraction,
  type AbeHuntMarkingExtraction,
  type AbeHuntStammdatenExtraction,
  type AbeHuntVehicleExtraction,
} from "@/lib/validations/abeDataHunterSchemas";
import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";

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

type HuntStepDef = {
  id: AbeDataHunterStep;
  stepNumber: number;
  title: string;
  hint: string;
  guideLabel: string;
};

const HUNT_STEPS: HuntStepDef[] = [
  {
    id: "stammdaten",
    stepNumber: 1,
    title: "Stammdaten",
    hint: "Fotografiere den Abschnitt mit KBA-Nummer, Nummer der ABE, Inhaber der ABE, Hersteller und Bezeichnung des Bauteils.",
    guideLabel: "KBA · ABE-Nr. · Inhaber · Hersteller · Bauteil",
  },
  {
    id: "marking",
    stepNumber: 2,
    title: "Kennzeichnung",
    hint: "Fotografiere den Abschnitt, der beschreibt, wie und wo am Bauteil die KBA-Nummer zu finden ist.",
    guideLabel: "Kennzeichnung am Bauteil",
  },
  {
    id: "vehicle",
    stepNumber: 3,
    title: "Fahrzeugfreigabe",
    hint: "Fotografiere die Tabelle, in der dein genaues Fahrzeugmodell (Verkaufsbezeichnung) aufgelistet ist.",
    guideLabel: "Verkaufsbezeichnung · erlaubte Fahrzeuge",
  },
  {
    id: "auflagen",
    stepNumber: 4,
    title: "Auflagen",
    hint: "Fotografiere die Liste der Auflagen-Kürzel, die für dein gewähltes Fahrzeug gelten.",
    guideLabel: "Auflagen zum Fahrzeug",
  },
];

type WizardPhase =
  | { kind: "capture"; stepIndex: number }
  | { kind: "confirm"; stepIndex: number }
  | { kind: "review" };

interface HuntState {
  stammdaten: AbeHuntStammdatenExtraction;
  marking: AbeHuntMarkingExtraction;
  vehicle: AbeHuntVehicleExtraction;
  auflagen: AbeHuntAuflagenExtraction;
  crops: Partial<Record<AbeDataHunterStep, File>>;
  manualReasons: Partial<Record<AbeDataHunterStep, string>>;
}

const EMPTY_STATE: HuntState = {
  stammdaten: {
    kbaNumber: null,
    abeNumber: null,
    abeHolder: null,
    manufacturer: null,
    partDesignation: null,
  },
  marking: { markingText: null },
  vehicle: { vehicleMatches: [] },
  auflagen: { auflagenCodes: [], auflagenNotes: null },
  crops: {},
  manualReasons: {},
};

type ReviewFormState = {
  kbaNumber: string;
  abeNumber: string;
  abeHolder: string;
  manufacturer: string;
  partDesignation: string;
  markingText: string;
  auflagenCodes: string;
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
): Promise<{ status: "ok" | "needs_manual"; extraction: T; reason?: string }> {
  const body = new FormData();
  body.set("file", file);
  body.set("step", `hunt-${step}`);

  const response = await fetch("/api/ocr/abe", { method: "POST", body });
  const payload = (await response.json().catch(() => null)) as
    | {
        ok: true;
        status: "ok" | "needs_manual";
        extraction: T;
        reason?: string;
      }
    | { ok: false; error?: string }
    | null;

  if (!response.ok || !payload || payload.ok !== true) {
    throw new HuntApiError(
      payload && "error" in payload && payload.error
        ? payload.error
        : `Analyse fehlgeschlagen (${response.status}).`,
    );
  }

  return {
    status: payload.status,
    extraction: payload.extraction,
    reason: payload.reason,
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

// ─── Shared confirm shell ──────────────────────────────────────────────────────

function ConfirmShell({
  title,
  reason,
  needsManual,
  children,
  onConfirm,
  onRescan,
  canConfirm,
}: {
  title: string;
  reason?: string;
  needsManual: boolean;
  children: React.ReactNode;
  onConfirm: () => void;
  onRescan: () => void;
  canConfirm: boolean;
}) {
  return (
    <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-4 px-4 py-6">
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          Ergebnis prüfen
        </p>
        <h2 className="mt-1 text-[1.2rem] font-semibold text-[color:var(--vd-text)]">
          {title}
        </h2>
      </div>

      {needsManual ? (
        <div className="rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-[0.84rem] leading-relaxed text-amber-950">
          <p className="font-semibold">
            Pflichtfeld fehlt — bitte manuell eintragen
          </p>
          {reason ? <p className="mt-1">{reason}</p> : null}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-[0.84rem] text-emerald-900">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Erkannt — bitte kurz prüfen und bestätigen.
        </div>
      )}

      <div className="space-y-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4">
        {children}
      </div>

      <div className="mt-auto grid gap-2">
        <Button type="button" disabled={!canConfirm} onClick={onConfirm}>
          Weiter
        </Button>
        <Button type="button" variant="outline" onClick={onRescan}>
          <RotateCcw className="h-4 w-4" />
          Abschnitt neu fotografieren
        </Button>
      </div>
    </section>
  );
}

function StammdatenConfirmPanel({
  value,
  reason,
  onChange,
  onConfirm,
  onRescan,
}: {
  value: AbeHuntStammdatenExtraction;
  reason?: string;
  onChange: (next: AbeHuntStammdatenExtraction) => void;
  onConfirm: () => void;
  onRescan: () => void;
}) {
  const complete = isAbeHuntStammdatenComplete(value);
  return (
    <ConfirmShell
      title="Stammdaten prüfen"
      reason={reason}
      needsManual={Boolean(reason) || !complete}
      onConfirm={onConfirm}
      onRescan={onRescan}
      canConfirm={complete}
    >
      <AbeFieldLabel label="KBA-Nummer *">
        <Input
          value={value.kbaNumber ?? ""}
          onChange={(e) =>
            onChange({ ...value, kbaNumber: e.target.value || null })
          }
          placeholder="z. B. 48185"
          className="font-mono"
        />
      </AbeFieldLabel>
      <AbeFieldLabel label="Nummer der ABE *">
        <Input
          value={value.abeNumber ?? ""}
          onChange={(e) =>
            onChange({ ...value, abeNumber: e.target.value || null })
          }
          placeholder="z. B. 48185*08"
          className="font-mono"
        />
      </AbeFieldLabel>
      <AbeFieldLabel label="Inhaber der ABE *">
        <Input
          value={value.abeHolder ?? ""}
          onChange={(e) =>
            onChange({ ...value, abeHolder: e.target.value || null })
          }
          placeholder="Inhaber laut ABE"
        />
      </AbeFieldLabel>
      <AbeFieldLabel label="Hersteller *">
        <Input
          value={value.manufacturer ?? ""}
          onChange={(e) =>
            onChange({ ...value, manufacturer: e.target.value || null })
          }
          placeholder="Hersteller laut ABE"
        />
      </AbeFieldLabel>
      <AbeFieldLabel label="Bezeichnung des Bauteils *">
        <Input
          value={value.partDesignation ?? ""}
          onChange={(e) =>
            onChange({ ...value, partDesignation: e.target.value || null })
          }
          placeholder="z. B. Sonderräder 8Jx18, Spoiler, Spurverbreiterung"
        />
      </AbeFieldLabel>
    </ConfirmShell>
  );
}

function MarkingConfirmPanel({
  value,
  reason,
  onChange,
  onConfirm,
  onRescan,
}: {
  value: AbeHuntMarkingExtraction;
  reason?: string;
  onChange: (next: AbeHuntMarkingExtraction) => void;
  onConfirm: () => void;
  onRescan: () => void;
}) {
  const complete = isAbeHuntMarkingComplete(value);
  return (
    <ConfirmShell
      title="Kennzeichnung prüfen"
      reason={reason}
      needsManual={Boolean(reason) || !complete}
      onConfirm={onConfirm}
      onRescan={onRescan}
      canConfirm={complete}
    >
      <AbeFieldLabel label="Kennzeichnung *">
        <textarea
          value={value.markingText ?? ""}
          onChange={(e) =>
            onChange({ ...value, markingText: e.target.value || null })
          }
          placeholder="Wo und wie ist die KBA-Nummer am Bauteil zu finden?"
          rows={5}
          className="flex w-full rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5 text-[0.92rem] text-[color:var(--vd-text)] outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
        />
      </AbeFieldLabel>
      <p className="text-[0.78rem] text-[color:var(--vd-muted)]">
        Beschreibt, wie und wo am Bauteil die KBA-Nummer / das Genehmigungszeichen
        zu finden ist.
      </p>
    </ConfirmShell>
  );
}

function VehicleConfirmPanel({
  value,
  reason,
  vehicleContext,
  vehicleLabel,
  selectedGroupIndex,
  onSelectGroup,
  onManualRows,
  onConfirm,
  onRescan,
}: {
  value: AbeHuntVehicleExtraction;
  reason?: string;
  vehicleContext?: AbeVehicleContext | null;
  vehicleLabel: string;
  selectedGroupIndex: number | null;
  onSelectGroup: (index: number) => void;
  onManualRows: (rows: AbeVehicleMatch[]) => void;
  onConfirm: () => void;
  onRescan: () => void;
}) {
  const groups = groupAbeVehicleMatches(value.vehicleMatches);
  const needsManual = Boolean(reason) || !isAbeHuntVehicleComplete(value);
  const [manualHeader, setManualHeader] = useState("");
  const needsSelection = requiresAbeVehicleGroupSelection(groups);
  const canConfirm =
    groups.length > 0 && (!needsSelection || selectedGroupIndex !== null);

  return (
    <ConfirmShell
      title="Fahrzeugfreigabe prüfen"
      reason={reason}
      needsManual={needsManual}
      onConfirm={onConfirm}
      onRescan={onRescan}
      canConfirm={canConfirm}
    >
      {groups.length > 0 ? (
        <AbeVehicleMatchPicker
          matches={value.vehicleMatches}
          selectedGroupIndex={selectedGroupIndex}
          onSelectGroup={onSelectGroup}
          vehicleContext={vehicleContext}
          vehicleLabel={vehicleLabel}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-[0.84rem] text-amber-900">
            Verkaufsbezeichnung ist Pflicht — bitte manuell eintragen (z. B.
            „5ER REIHE“).
          </p>
          <AbeFieldLabel label="Verkaufsbezeichnung *">
            <Input
              value={manualHeader}
              onChange={(e) => setManualHeader(e.target.value)}
              placeholder="Verkaufsbezeichnung"
            />
          </AbeFieldLabel>
          <Button
            type="button"
            variant="outline"
            disabled={!manualHeader.trim()}
            onClick={() => {
              const header = manualHeader.trim();
              onManualRows([
                {
                  verkaufsbezeichnung: header,
                  fahrzeugtyp: null,
                  typeApproval: null,
                  driveType: null,
                  tireSizes: [],
                  auflagenCodes: [],
                },
              ]);
              onSelectGroup(0);
            }}
          >
            Übernehmen
          </Button>
        </div>
      )}
    </ConfirmShell>
  );
}

function AuflagenConfirmPanel({
  value,
  reason,
  onChange,
  onConfirm,
  onRescan,
}: {
  value: AbeHuntAuflagenExtraction;
  reason?: string;
  onChange: (next: AbeHuntAuflagenExtraction) => void;
  onConfirm: () => void;
  onRescan: () => void;
}) {
  const complete = isAbeHuntAuflagenComplete(value);
  return (
    <ConfirmShell
      title="Auflagen prüfen"
      reason={reason}
      needsManual={Boolean(reason) || !complete}
      onConfirm={onConfirm}
      onRescan={onRescan}
      canConfirm={complete}
    >
      <AbeFieldLabel label="Auflagen-Kürzel zum Fahrzeug *">
        <Input
          value={value.auflagenCodes.join(" ")}
          onChange={(e) =>
            onChange({ ...value, auflagenCodes: parseCodes(e.target.value) })
          }
          placeholder="z. B. 744 A77 12A"
          className="font-mono"
        />
      </AbeFieldLabel>
      <AbeFieldLabel label="Hinweise (optional)">
        <Input
          value={value.auflagenNotes ?? ""}
          onChange={(e) =>
            onChange({ ...value, auflagenNotes: e.target.value || null })
          }
          placeholder="Freitext neben den Kürzeln"
        />
      </AbeFieldLabel>
    </ConfirmShell>
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
  const [phase, setPhase] = useState<WizardPhase>({
    kind: "capture",
    stepIndex: 0,
  });
  const [state, setState] = useState<HuntState>(EMPTY_STATE);
  const [extracting, setExtracting] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(
    null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  function goBack() {
    if (onBack) onBack();
    else if (backHref) window.location.href = backHref;
  }

  function restart() {
    setState(EMPTY_STATE);
    setSelectedGroupIndex(null);
    setSaveError(null);
    setCaptureError(null);
    setPhase({ kind: "capture", stepIndex: 0 });
  }

  async function handleCropped(file: File) {
    if (phase.kind !== "capture") return;
    const step = HUNT_STEPS[phase.stepIndex]!;
    setExtracting(true);
    setCaptureError(null);
    try {
      if (step.id === "stammdaten") {
        const result = await callHuntStep<AbeHuntStammdatenExtraction>(
          file,
          "stammdaten",
        );
        setState((prev) => ({
          ...prev,
          stammdaten: result.extraction,
          crops: { ...prev.crops, stammdaten: file },
          manualReasons: {
            ...prev.manualReasons,
            stammdaten:
              result.status === "needs_manual" ? result.reason : undefined,
          },
        }));
      } else if (step.id === "marking") {
        const result = await callHuntStep<AbeHuntMarkingExtraction>(
          file,
          "marking",
        );
        setState((prev) => ({
          ...prev,
          marking: result.extraction,
          crops: { ...prev.crops, marking: file },
          manualReasons: {
            ...prev.manualReasons,
            marking:
              result.status === "needs_manual" ? result.reason : undefined,
          },
        }));
      } else if (step.id === "vehicle") {
        const result = await callHuntStep<AbeHuntVehicleExtraction>(
          file,
          "vehicle",
        );
        const groups = groupAbeVehicleMatches(result.extraction.vehicleMatches);
        setSelectedGroupIndex(resolveInitialAbeVehicleGroupIndex(groups));
        setState((prev) => ({
          ...prev,
          vehicle: result.extraction,
          crops: { ...prev.crops, vehicle: file },
          manualReasons: {
            ...prev.manualReasons,
            vehicle:
              result.status === "needs_manual" ? result.reason : undefined,
          },
        }));
      } else {
        const result = await callHuntStep<AbeHuntAuflagenExtraction>(
          file,
          "auflagen",
        );
        setState((prev) => ({
          ...prev,
          auflagen: result.extraction,
          crops: { ...prev.crops, auflagen: file },
          manualReasons: {
            ...prev.manualReasons,
            auflagen:
              result.status === "needs_manual" ? result.reason : undefined,
          },
        }));
      }

      setPhase({ kind: "confirm", stepIndex: phase.stepIndex });
    } catch (err) {
      setCaptureError(
        err instanceof Error ? err.message : "Analyse fehlgeschlagen.",
      );
    } finally {
      setExtracting(false);
    }
  }

  function confirmStep(stepIndex: number) {
    const step = HUNT_STEPS[stepIndex]!;
    if (step.id === "stammdaten" && !isAbeHuntStammdatenComplete(state.stammdaten)) {
      setCaptureError("Bitte alle Stammdaten-Pflichtfelder ausfüllen.");
      return;
    }
    if (step.id === "marking" && !isAbeHuntMarkingComplete(state.marking)) {
      setCaptureError("Bitte die Kennzeichnung eintragen.");
      return;
    }
    if (step.id === "vehicle") {
      const groups = groupAbeVehicleMatches(state.vehicle.vehicleMatches);
      if (!isAbeHuntVehicleComplete(state.vehicle)) {
        setCaptureError("Bitte eine Verkaufsbezeichnung wählen oder eintragen.");
        return;
      }
      if (requiresAbeVehicleGroupSelection(groups) && selectedGroupIndex === null) {
        setCaptureError("Bitte die passende Verkaufsbezeichnung wählen.");
        return;
      }
      if (groups.length === 1) setSelectedGroupIndex(0);
    }
    if (step.id === "auflagen" && !isAbeHuntAuflagenComplete(state.auflagen)) {
      setCaptureError("Bitte Auflagen-Kürzel zum Fahrzeug eintragen.");
      return;
    }

    setCaptureError(null);
    if (stepIndex >= HUNT_STEPS.length - 1) {
      setPhase({ kind: "review" });
      return;
    }
    setPhase({ kind: "capture", stepIndex: stepIndex + 1 });
  }

  const report = useMemo(
    () =>
      mergeAbeDataHunterSteps(
        state.stammdaten,
        state.marking,
        state.vehicle,
        state.auflagen,
      ),
    [state.stammdaten, state.marking, state.vehicle, state.auflagen],
  );

  function handleSave(reviewForm: ReviewFormState) {
    const groups = groupAbeVehicleMatches(report.vehicleMatches);
    const needsSelection = requiresAbeVehicleGroupSelection(groups);
    const resolvedIndex = needsSelection
      ? selectedGroupIndex
      : (selectedGroupIndex ?? 0);

    const selectedGroup =
      resolvedIndex !== null ? groups[resolvedIndex] ?? null : null;

    const draft: AbeDataHunterReport = {
      kbaNumber: reviewForm.kbaNumber.trim() || null,
      abeNumber: reviewForm.abeNumber.trim() || null,
      abeHolder: reviewForm.abeHolder.trim() || null,
      manufacturer: reviewForm.manufacturer.trim() || null,
      partDesignation: reviewForm.partDesignation.trim() || null,
      markingText: reviewForm.markingText.trim() || null,
      vehicleMatches: report.vehicleMatches,
      auflagenCodes: parseCodes(reviewForm.auflagenCodes),
      auflagenNotes: report.auflagenNotes,
    };

    const missing = missingAbeRequiredFields(
      draft,
      selectedGroup?.verkaufsbezeichnung,
    );
    if (missing.length > 0) {
      setSaveError(
        `Pflichtfelder fehlen: ${missing
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
      const cropFiles = HUNT_STEPS.map((step) => state.crops[step.id]).filter(
        (file): file is File => Boolean(file),
      );
      let uploadFile: File | null = null;
      try {
        if (cropFiles.length === 0) {
          setSaveError("Keine Fotos zum Speichern vorhanden.");
          return;
        }
        const pdf = await convertImagesToPdf(cropFiles, {
          fileName: `abe-hunt-${Date.now()}`,
          fullBleed: true,
          imageCompression: "MEDIUM",
        });
        uploadFile = pdf.file;
      } catch {
        uploadFile = cropFiles[0] ?? null;
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
      formData.set("pageCount", String(cropFiles.length || 1));
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

  if (phase.kind === "capture") {
    const step = HUNT_STEPS[phase.stepIndex]!;
    return (
      <>
        {captureError ? (
          <div className="fixed bottom-4 left-4 right-4 z-[10000] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.82rem] text-red-800 shadow-lg">
            {captureError}
          </div>
        ) : null}
        <ImageCropCapture
          title={step.title}
          hint={step.hint}
          guideLabel={step.guideLabel}
          stepNumber={step.stepNumber}
          totalSteps={HUNT_STEPS.length}
          isBusy={extracting}
          onCropped={(file) => void handleCropped(file)}
          onClose={() => {
            if (phase.stepIndex === 0) goBack();
            else setPhase({ kind: "confirm", stepIndex: phase.stepIndex - 1 });
          }}
        />
      </>
    );
  }

  if (phase.kind === "confirm") {
    const step = HUNT_STEPS[phase.stepIndex]!;
    if (step.id === "stammdaten") {
      return (
        <StammdatenConfirmPanel
          value={state.stammdaten}
          reason={state.manualReasons.stammdaten}
          onChange={(stammdaten) =>
            setState((prev) => ({ ...prev, stammdaten }))
          }
          onConfirm={() => confirmStep(phase.stepIndex)}
          onRescan={() =>
            setPhase({ kind: "capture", stepIndex: phase.stepIndex })
          }
        />
      );
    }
    if (step.id === "marking") {
      return (
        <MarkingConfirmPanel
          value={state.marking}
          reason={state.manualReasons.marking}
          onChange={(marking) => setState((prev) => ({ ...prev, marking }))}
          onConfirm={() => confirmStep(phase.stepIndex)}
          onRescan={() =>
            setPhase({ kind: "capture", stepIndex: phase.stepIndex })
          }
        />
      );
    }
    if (step.id === "vehicle") {
      return (
        <VehicleConfirmPanel
          value={state.vehicle}
          reason={state.manualReasons.vehicle}
          vehicleContext={vehicleContext}
          vehicleLabel={vehicleLabel}
          selectedGroupIndex={selectedGroupIndex}
          onSelectGroup={setSelectedGroupIndex}
          onManualRows={(rows) =>
            setState((prev) => ({
              ...prev,
              vehicle: { vehicleMatches: rows },
              manualReasons: { ...prev.manualReasons, vehicle: undefined },
            }))
          }
          onConfirm={() => confirmStep(phase.stepIndex)}
          onRescan={() =>
            setPhase({ kind: "capture", stepIndex: phase.stepIndex })
          }
        />
      );
    }
    return (
      <AuflagenConfirmPanel
        value={state.auflagen}
        reason={state.manualReasons.auflagen}
        onChange={(auflagen) => setState((prev) => ({ ...prev, auflagen }))}
        onConfirm={() => confirmStep(phase.stepIndex)}
        onRescan={() =>
          setPhase({ kind: "capture", stepIndex: phase.stepIndex })
        }
      />
    );
  }

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
