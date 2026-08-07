"use client";

import { CheckCircle2 } from "lucide-react";

import {
  findBestAbeVehicleMatchIndex,
  formatAbeVehicleMatchLabel,
} from "@/lib/ocr/abe-wizard-vehicle-match";
import type { AbeVehicleContext } from "@/lib/validations/abeSchema";
import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";

export function abeVehicleMatchKey(
  match: AbeVehicleMatch,
  index: number,
): string {
  return `${index}-${match.model}-${match.driveType ?? ""}-${match.typeApproval ?? ""}`;
}

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

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          Dein Fahrzeug
        </p>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
          Wähle die passende Zeile aus der Fahrzeugtabelle — die Auflagen werden
          danach gefiltert.
        </p>
        {vehicleLabel ? (
          <p className="mt-1 text-[0.78rem] font-medium text-[color:var(--vd-text)]">
            Garage: {vehicleLabel}
          </p>
        ) : null}
      </div>

      <div
        className="space-y-2"
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
                "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                selected
                  ? "border-emerald-500/40 bg-emerald-500/10"
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
                  {match.tireSizes.length > 0 ? (
                    <p className="mt-1 text-[0.75rem] text-[color:var(--vd-muted)]">
                      Reifen: {match.tireSizes.join(", ")}
                    </p>
                  ) : null}
                  {match.auflagenCodes.length > 0 ? (
                    <p className="mt-1 text-[0.72rem] text-[color:var(--vd-muted)]">
                      {match.auflagenCodes.length} Auflagen-Codes
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
        <p className="text-[0.78rem] text-amber-800">{selectionError}</p>
      ) : null}

      {selectedMatch && selectedMatch.auflagenCodes.length > 0 ? (
        <div className="rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-4 py-3">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Auflagen für deine Auswahl ({selectedMatch.auflagenCodes.length})
          </p>
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
        </div>
      ) : null}
    </div>
  );
}
