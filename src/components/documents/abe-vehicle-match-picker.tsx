"use client";

import { CheckCircle2 } from "lucide-react";

import { CompatibilityTable } from "@/components/dashboard/CompatibilityTable";
import {
  abeVehicleGroupKey,
  findBestAbeVehicleGroupIndex,
  groupAbeVehicleMatches,
  vehicleGroupRowsToTableData,
  type AbeVehicleGroup,
} from "@/lib/ocr/abe-wizard-vehicle-match";
import type { AbeVehicleContext } from "@/lib/validations/abeSchema";
import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";

interface AbeVehicleMatchPickerProps {
  matches: AbeVehicleMatch[];
  selectedGroupIndex: number | null;
  onSelectGroup: (index: number) => void;
  vehicleContext?: AbeVehicleContext | null;
  vehicleLabel?: string | null;
  selectionError?: string | null;
}

export function AbeVehicleMatchPicker({
  matches,
  selectedGroupIndex,
  onSelectGroup,
  vehicleContext = null,
  vehicleLabel = null,
  selectionError = null,
}: AbeVehicleMatchPickerProps) {
  const groups = groupAbeVehicleMatches(matches);
  if (groups.length === 0) return null;

  const suggestedIndex = findBestAbeVehicleGroupIndex(groups, vehicleContext);
  const selectedGroup: AbeVehicleGroup | null =
    selectedGroupIndex !== null ? groups[selectedGroupIndex] ?? null : null;

  return (
    <section className="space-y-4 rounded-[1.35rem] border border-emerald-500/25 bg-emerald-500/5 p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
      <div>
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-emerald-800">
          Verkaufsbezeichnung wählen
        </p>
        <p className="mt-1 text-[0.92rem] font-semibold text-[color:var(--vd-text)]">
          Wähle die Überschrift deiner Fahrzeugtabelle
        </p>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
          Die komplette Tabelle unter dieser Verkaufsbezeichnung wird übernommen.
        </p>
        {vehicleLabel ? (
          <p className="mt-2 text-[0.78rem] font-medium text-[color:var(--vd-text)]">
            Garage: {vehicleLabel}
          </p>
        ) : null}
      </div>

      <div
        className="space-y-2"
        role="radiogroup"
        aria-label="Verkaufsbezeichnung aus der ABE-Tabelle wählen"
      >
        {groups.map((group, index) => {
          const selected = selectedGroupIndex === index;
          const suggested = suggestedIndex === index;

          return (
            <button
              key={abeVehicleGroupKey(group, index)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelectGroup(index)}
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
                    {group.verkaufsbezeichnung}
                  </p>
                  <p className="mt-1 text-[0.72rem] text-[color:var(--vd-muted)]">
                    {group.rows.length}{" "}
                    {group.rows.length === 1 ? "Zeile" : "Zeilen"} in der
                    Tabelle
                  </p>
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

      {selectedGroup ? (
        <div className="space-y-3">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Übernommene Tabelle · {selectedGroup.verkaufsbezeichnung}
          </p>
          <CompatibilityTable
            table={vehicleGroupRowsToTableData(selectedGroup)}
            title="Fahrzeug- und Auflagen-Tabelle"
            className="border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-3 shadow-none"
          />
        </div>
      ) : (
        <p className="text-[0.78rem] font-medium text-amber-800">
          Bitte eine Verkaufsbezeichnung wählen, bevor du speicherst.
        </p>
      )}
    </section>
  );
}
