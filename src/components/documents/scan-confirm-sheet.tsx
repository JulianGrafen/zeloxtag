"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDocumentAmount, formatDocumentDate } from "@/lib/documents/format";
import type { DocumentType } from "@/types/database";

export type ScanConfirmValues = {
  type: DocumentType;
  typeLabel: string;
  title: string;
  vendor: string;
  date: string | null;
  amount: number | null;
  mileageKm: number | null;
  vehicleLabel: string;
};

export type ScanConfirmSheetProps = {
  open: boolean;
  values: ScanConfirmValues;
  vehicleMismatch: boolean;
  vehicleMismatchReason: string | null;
  mileageWarning: string | null;
  duplicateHint: string | null;
  saving?: boolean;
  onChange: (patch: Partial<ScanConfirmValues>) => void;
  onConfirm: () => void;
  onDiscard: () => void;
  onAssignAnyway?: () => void;
};

const TYPE_OPTIONS: Array<{ value: DocumentType; label: string }> = [
  { value: "invoice", label: "Rechnung" },
  { value: "abe", label: "ABE / Gutachten" },
  { value: "tuev", label: "TÜV / HU" },
  { value: "other", label: "Sonstiges" },
];

export function ScanConfirmSheet({
  open,
  values,
  vehicleMismatch,
  vehicleMismatchReason,
  mileageWarning,
  duplicateHint,
  saving = false,
  onChange,
  onConfirm,
  onDiscard,
  onAssignAnyway,
}: ScanConfirmSheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-neutral-950/55 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-confirm-title"
    >
      <div className="flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.5rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow)] sm:rounded-[1.5rem]">
        <header className="flex items-start gap-3 border-b border-[color:var(--vd-border)] px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-[color:var(--vd-muted)]">
              Scan prüfen
            </p>
            <h2
              id="scan-confirm-title"
              className="mt-1 font-[family-name:var(--font-display)] text-[1.15rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]"
            >
              Beleg speichern?
            </h2>
            <p className="mt-1 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
              Felder kurz prüfen — erst danach landet der Beleg in der Akte.
            </p>
          </div>
          <button
            type="button"
            onClick={onDiscard}
            aria-label="Verwerfen"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-[color:var(--vd-muted)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {vehicleMismatch ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[0.82rem] text-amber-900">
              <p className="flex items-start gap-2 font-semibold">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Falsches Fahrzeug?
              </p>
              <p className="mt-1 leading-relaxed">{vehicleMismatchReason}</p>
            </div>
          ) : null}

          {mileageWarning ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[0.82rem] text-amber-900">
              {mileageWarning}
            </div>
          ) : null}

          {duplicateHint ? (
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/8 px-3 py-2.5 text-[0.82rem] text-sky-900">
              {duplicateHint}
            </div>
          ) : null}

          {values.type === "invoice" &&
          /tuning|umbau|fahrwerk|felgen/i.test(values.title) ? (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5 text-[0.82rem] text-emerald-900">
              Tipp: Nach dem Speichern kannst du unter{" "}
              <span className="font-semibold">Mehr → Umbau-Bilder</span> Fotos
              zum Umbau ablegen.
            </div>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              Typ
            </span>
            <select
              value={values.type}
              onChange={(event) => {
                const next = event.target.value as DocumentType;
                const label =
                  TYPE_OPTIONS.find((o) => o.value === next)?.label ?? next;
                onChange({ type: next, typeLabel: label });
              }}
              className="w-full rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5 text-[0.9rem] text-[color:var(--vd-text)]"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              Titel
            </span>
            <input
              value={values.title}
              onChange={(event) => onChange({ title: event.target.value })}
              className="w-full rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5 text-[0.9rem] text-[color:var(--vd-text)]"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              Werkstatt / Anbieter
            </span>
            <input
              value={values.vendor}
              onChange={(event) => onChange({ vendor: event.target.value })}
              className="w-full rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5 text-[0.9rem] text-[color:var(--vd-text)]"
            />
          </label>

          <dl className="grid grid-cols-2 gap-2 text-[0.85rem]">
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.68rem] text-[color:var(--vd-muted)]">Datum</dt>
              <dd className="mt-0.5 font-semibold text-[color:var(--vd-text)]">
                {values.date ? formatDocumentDate(values.date) : "—"}
              </dd>
            </div>
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.68rem] text-[color:var(--vd-muted)]">Betrag</dt>
              <dd className="mt-0.5 font-semibold text-[color:var(--vd-text)]">
                {formatDocumentAmount(values.amount) ?? "—"}
              </dd>
            </div>
            <div className="col-span-2 rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.68rem] text-[color:var(--vd-muted)]">Kilometerstand</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-[color:var(--vd-text)]">
                {values.mileageKm != null
                  ? `${values.mileageKm.toLocaleString("de-DE")} km`
                  : "—"}
              </dd>
            </div>
            <div className="col-span-2 rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.68rem] text-[color:var(--vd-muted)]">Fahrzeug</dt>
              <dd className="mt-0.5 font-semibold text-[color:var(--vd-text)]">
                {values.vehicleLabel}
              </dd>
            </div>
          </dl>
        </div>

        <footer className="space-y-2 border-t border-[color:var(--vd-border)] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {vehicleMismatch ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={saving}
                onClick={onDiscard}
              >
                Verwerfen
              </Button>
              <Button
                type="button"
                className="w-full"
                disabled={saving}
                onClick={onAssignAnyway ?? onConfirm}
              >
                Trotzdem zuordnen
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                className="w-full"
                disabled={saving}
                onClick={onConfirm}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                {saving ? "Speichern…" : "In Akte speichern"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={saving}
                onClick={onDiscard}
              >
                Verwerfen
              </Button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
