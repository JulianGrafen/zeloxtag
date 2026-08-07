"use client";

import { CheckCircle2 } from "lucide-react";

import { CompatibilityTable } from "@/components/dashboard/CompatibilityTable";
import {
  abeVehicleMatchIndexFromRowId,
  abeVehicleMatchKey,
  abeVehicleMatchRowId,
  findBestAbeVehicleMatchIndex,
  formatAbeVehicleMatchLabel,
  vehicleMatchesToTableData,
} from "@/lib/ocr/abe-wizard-vehicle-match";
import type { AbeVehicleContext } from "@/lib/validations/abeSchema";
import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";

export { abeVehicleMatchKey };

interface AbeVehicleMatchPickerProps {
  matches: AbeVehicleMatch[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  vehicleContext?: AbeVehicleContext | null;
  vehicleLabel?: string | null;
  selectionError?: string | null;
}

export function AbeVehicleMatchPicker({
  matches,
  selectedIndex,
  onSelect,
  vehicleContext = null,
  vehicleLabel = null,
  selectionError = null,
}: AbeVehicleMatchPickerProps) {
  if (matches.length === 0) return null;

  const suggestedIndex = findBestAbeVehicleMatchIndex(matches, vehicleContext);
  const selectedMatch =
    selectedIndex !== null ? matches[selectedIndex] ?? null : null;
  const table = vehicleMatchesToTableData(
    matches,
    selectedIndex,
    vehicleContext,
  );
  const selectedRowId =
    selectedIndex !== null ? abeVehicleMatchRowId(selectedIndex) : null;

  return (
    <section className="space-y-4 rounded-[1.35rem] border border-emerald-500/25 bg-emerald-500/5 p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
      <div>
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-emerald-800">
          Dein Fahrzeug wählen
        </p>
        <p className="mt-1 text-[0.92rem] font-semibold text-[color:var(--vd-text)]">
          Tippe die passende Zeile aus der extrahierten Fahrzeugtabelle an
        </p>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
          Nur die Auflagen der gewählten Zeile werden gespeichert.
        </p>
        {vehicleLabel ? (
          <p className="mt-2 text-[0.78rem] font-medium text-[color:var(--vd-text)]">
            Garage: {vehicleLabel}
          </p>
        ) : null}
      </div>

      <CompatibilityTable
        table={table}
        title="Extrahierte Fahrzeugfreigaben"
        selectedRowId={selectedRowId}
        onSelectRow={(rowId) => {
          const index = abeVehicleMatchIndexFromRowId(rowId);
          if (index !== null) onSelect(index);
        }}
        className="hidden border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-3 shadow-none md:block"
      />

      <div
        className="space-y-2 md:hidden"
        role="radiogroup"
        aria-label="Fahrzeug aus der ABE-Tabelle wählen"
      >
        {matches.map((match, index) => {
          const selected = selectedIndex === index;
          const suggested = suggestedIndex === index;
          const label = formatAbeVehicleMatchLabel(match);

          return (
            <button
              key={abeVehicleMatchKey(match, index)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(index)}
              className={[
                "w-full rounded-2xl border px-4 py-3.5 text-left transition-colors touch-manipulation",
                selected
                  ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                  : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] active:bg-neutral-100",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-[color:var(--vd-text)]">
                    {label}
                  </p>
                  {match.typeApproval ? (
                    <p className="mt-1 break-all text-[0.72rem] text-[color:var(--vd-muted)]">
                      {match.typeApproval}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {suggested ? (
                    <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[0.62rem] font-medium text-white">
                      Vorschlag
                    </span>
                  ) : null}
                  {selected ? (
                    <CheckCircle2
                      className="h-5 w-5 text-emerald-600"
                      aria-hidden
                    />
                  ) : (
                    <span
                      className="h-5 w-5 rounded-full border-2 border-[color:var(--vd-border)]"
                      aria-hidden
                    />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectionError ? (
        <p className="rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-[0.82rem] text-amber-900">
          {selectionError}
        </p>
      ) : null}

      {selectedMatch ? (
        <div className="rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-4 py-3">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Ausgewählt: {formatAbeVehicleMatchLabel(selectedMatch)}
          </p>
          {selectedMatch.auflagenCodes.length > 0 ? (
            <p className="mt-2 flex flex-wrap gap-1.5">
              {selectedMatch.auflagenCodes.map((code) => (
                <span
                  key={code}
                  className="rounded-full bg-neutral-900/5 px-2 py-0.5 font-mono text-[0.72rem] text-[color:var(--vd-text)]"
                >
                  {code}
                </span>
              ))}
            </p>
          ) : (
            <p className="mt-2 text-[0.78rem] text-[color:var(--vd-muted)]">
              Keine Auflagen-Codes in dieser Zeile.
            </p>
          )}
        </div>
      ) : (
        <p className="text-[0.78rem] font-medium text-amber-800">
          Bitte eine Zeile auswählen, bevor du speicherst.
        </p>
      )}
    </section>
  );
}
