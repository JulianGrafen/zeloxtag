"use client";

import { CheckCircle2 } from "lucide-react";

import { ABE_VEHICLE_MODEL_DISPLAY_LABEL } from "@/lib/documents/abe-detail-display";
import {
  listAbeVehicleVariantOptions,
  type AbeVehicleVariantOption,
} from "@/lib/ocr/abe-wizard-vehicle-match";
import type { AbeVehicleContext } from "@/lib/validations/abeSchema";
import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";

interface AbeVehicleMatchPickerProps {
  matches: AbeVehicleMatch[];
  selectedGroupIndex: number | null;
  onSelectGroup: (index: number) => void;
  selectedRowId?: string | null;
  onSelectRow?: (rowId: string) => void;
  vehicleContext?: AbeVehicleContext | null;
  vehicleLabel?: string | null;
  selectionError?: string | null;
}

function VariantOptionButton({
  option,
  selected,
  onSelect,
}: {
  option: AbeVehicleVariantOption;
  selected: boolean;
  onSelect: (option: AbeVehicleVariantOption) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(option)}
      className={[
        "w-full rounded-2xl border px-4 py-3.5 text-left transition-colors touch-manipulation",
        selected
          ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
          : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] active:bg-neutral-100",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-[color:var(--vd-text)]">
            {option.label}
          </p>
          {option.hint ? (
            <p className="mt-0.5 truncate text-[0.72rem] text-[color:var(--vd-muted)]">
              {option.hint}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {option.suggested ? (
            <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[0.62rem] font-medium text-white">
              Vorschlag
            </span>
          ) : null}
          {selected ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
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
}

export function AbeVehicleMatchPicker({
  matches,
  selectedGroupIndex,
  onSelectGroup,
  selectedRowId = null,
  onSelectRow,
  vehicleContext = null,
  vehicleLabel = null,
  selectionError = null,
}: AbeVehicleMatchPickerProps) {
  const variants = listAbeVehicleVariantOptions(matches, vehicleContext);
  if (variants.length === 0) return null;

  const selectedVariant =
    selectedGroupIndex !== null && selectedRowId
      ? variants.find(
          (option) =>
            option.groupIndex === selectedGroupIndex &&
            option.rowId === selectedRowId,
        ) ?? null
      : null;

  function handleSelect(option: AbeVehicleVariantOption) {
    onSelectGroup(option.groupIndex);
    onSelectRow?.(option.rowId);
  }

  if (variants.length === 1) {
    const only = variants[0]!;

    return (
      <section className="space-y-4 rounded-[1.35rem] border border-emerald-500/25 bg-emerald-500/5 p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
        <div>
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-emerald-800">
            {ABE_VEHICLE_MODEL_DISPLAY_LABEL}
          </p>
          <p className="mt-1 text-[0.92rem] font-semibold text-[color:var(--vd-text)]">
            {only.label}
          </p>
          {vehicleLabel ? (
            <p className="mt-2 text-[0.78rem] font-medium text-[color:var(--vd-text)]">
              Garage: {vehicleLabel}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-[1.35rem] border border-emerald-500/25 bg-emerald-500/5 p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
      <div>
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-emerald-800">
          Fahrzeugzeile wählen
        </p>
        <p className="mt-1 text-[0.92rem] font-semibold text-[color:var(--vd-text)]">
          {variants.length} Varianten erkannt
        </p>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
          Wähle die Zeile, die auf dem Foto steht — Modell und Fahrzeugtyp
          wie in der Tabelle. Danach scannst du nur die Auflagen für genau
          diese Zeile.
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
        aria-label="Fahrzeugzeile aus der ABE-Tabelle wählen"
      >
        {variants.map((option) => (
          <VariantOptionButton
            key={`${option.groupIndex}-${option.rowId}`}
            option={option}
            selected={
              selectedVariant?.groupIndex === option.groupIndex &&
              selectedVariant.rowId === option.rowId
            }
            onSelect={handleSelect}
          />
        ))}
      </div>

      {selectionError ? (
        <p
          role="alert"
          className="rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-[0.82rem] text-amber-900"
        >
          {selectionError}
        </p>
      ) : null}

      {!selectedVariant ? (
        <p className="text-[0.78rem] font-medium text-amber-800">
          Tippe auf deine Fahrzeugzeile, um die passenden Auflagen zu scannen.
        </p>
      ) : null}
    </section>
  );
}
