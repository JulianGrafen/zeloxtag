"use client";

import { useState } from "react";
import { CheckCircle2, ChevronLeft } from "lucide-react";

import type {
  AbeConfiguration,
  AbeTableExtraction,
  AbeVehicle,
  AbeVehicleSelection,
} from "@/types/abe";

type VehicleSelectorStep = "vehicle" | "configuration";

export type VehicleSelectorProps = {
  extractedData: AbeTableExtraction;
  onSave: (selection: AbeVehicleSelection) => void | Promise<void>;
  saving?: boolean;
  saveLabel?: string;
};

function ModelButton({
  modelName,
  configurationCount,
  selected,
  onSelect,
}: {
  modelName: string;
  configurationCount: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={[
        "w-full rounded-2xl border px-4 py-3.5 text-left transition-colors touch-manipulation",
        selected
          ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
          : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] active:bg-neutral-100",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-[color:var(--vd-text)]">{modelName}</p>
          <p className="mt-0.5 text-[0.72rem] text-[color:var(--vd-muted)]">
            {configurationCount}{" "}
            {configurationCount === 1 ? "Konfiguration" : "Konfigurationen"}
          </p>
        </div>
        {selected ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        ) : (
          <span
            className="h-5 w-5 shrink-0 rounded-full border-2 border-[color:var(--vd-border)]"
            aria-hidden
          />
        )}
      </div>
    </button>
  );
}

function ConfigurationCard({
  configuration,
  selected,
  onSelect,
}: {
  configuration: AbeConfiguration;
  selected: boolean;
  onSelect: () => void;
}) {
  const auflagenPreview =
    configuration.auflagen_codes.length > 0
      ? configuration.auflagen_codes.join(", ")
      : "Keine Auflagen erkannt";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={[
        "w-full rounded-2xl border px-4 py-3.5 text-left transition-colors touch-manipulation",
        selected
          ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
          : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] active:bg-neutral-100",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-[color:var(--vd-text)]">
            {configuration.kw_range.trim() || "kW n. a."} ·{" "}
            {configuration.tire_size.trim() || "Reifen n. a."}
          </p>
          <p className="text-[0.72rem] text-[color:var(--vd-muted)]">
            Auflagen: {auflagenPreview}
          </p>
        </div>
        {selected ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        ) : (
          <span
            className="h-5 w-5 shrink-0 rounded-full border-2 border-[color:var(--vd-border)]"
            aria-hidden
          />
        )}
      </div>
    </button>
  );
}

export function VehicleSelector({
  extractedData,
  onSave,
  saving = false,
  saveLabel = "Auflagen übernehmen",
}: VehicleSelectorProps) {
  const vehicles = extractedData.vehicles.filter(
    (vehicle) => vehicle.configurations.length > 0,
  );

  const [step, setStep] = useState<VehicleSelectorStep>("vehicle");
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState<number | null>(
    null,
  );
  const [selectedConfigurationIndex, setSelectedConfigurationIndex] = useState<
    number | null
  >(null);

  if (vehicles.length === 0) {
    return (
      <section className="rounded-[1.35rem] border border-amber-300/70 bg-amber-50 px-4 py-3.5 text-[0.82rem] text-amber-900">
        Keine Fahrzeuge in der Tabelle erkannt. Bitte Foto erneut aufnehmen oder
        manuell eingeben.
      </section>
    );
  }

  const selectedVehicle: AbeVehicle | null =
    selectedVehicleIndex !== null ? vehicles[selectedVehicleIndex] ?? null : null;

  async function handleSave() {
    if (
      selectedVehicleIndex === null ||
      selectedConfigurationIndex === null ||
      !selectedVehicle
    ) {
      return;
    }

    const configuration =
      selectedVehicle.configurations[selectedConfigurationIndex] ?? null;
    if (!configuration) return;

    await onSave({
      vehicle: selectedVehicle,
      configuration,
      configurationIndex: selectedConfigurationIndex,
      auflagen_codes: configuration.auflagen_codes,
    });
  }

  if (step === "vehicle") {
    return (
      <section className="space-y-4 rounded-[1.35rem] border border-emerald-500/25 bg-emerald-500/5 p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
        <div>
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-emerald-800">
            Schritt 1 · Fahrzeug
          </p>
          <p className="mt-1 text-[0.92rem] font-semibold text-[color:var(--vd-text)]">
            Welches Modell steht in deiner ABE?
          </p>
          <p className="mt-1 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
            Wähle die Handelsbezeichnung, die in der Tabelle steht.
          </p>
        </div>

        <div
          className="space-y-2"
          role="radiogroup"
          aria-label="Fahrzeugmodell aus der ABE-Tabelle wählen"
        >
          {vehicles.map((vehicle, index) => (
            <ModelButton
              key={`${vehicle.model_name}-${index}`}
              modelName={vehicle.model_name}
              configurationCount={vehicle.configurations.length}
              selected={selectedVehicleIndex === index}
              onSelect={() => {
                setSelectedVehicleIndex(index);
                setSelectedConfigurationIndex(null);
                setStep("configuration");
              }}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-[1.35rem] border border-emerald-500/25 bg-emerald-500/5 p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
      <div>
        <button
          type="button"
          onClick={() => {
            setStep("vehicle");
            setSelectedConfigurationIndex(null);
          }}
          className="mb-2 inline-flex items-center gap-1 text-[0.78rem] font-medium text-emerald-800 touch-manipulation"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Anderes Modell wählen
        </button>
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-emerald-800">
          Schritt 2 · Konfiguration
        </p>
        <p className="mt-1 text-[0.92rem] font-semibold text-[color:var(--vd-text)]">
          {selectedVehicle?.model_name}
        </p>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
          Wähle kW-Bereich und Reifengröße — die Auflagen dieser Zeile werden
          übernommen.
        </p>
      </div>

      <div
        className="space-y-2"
        role="radiogroup"
        aria-label="Fahrzeugkonfiguration aus der ABE-Tabelle wählen"
      >
        {selectedVehicle?.configurations.map((configuration, index) => (
          <ConfigurationCard
            key={`${configuration.kw_range}-${configuration.tire_size}-${index}`}
            configuration={configuration}
            selected={selectedConfigurationIndex === index}
            onSelect={() => setSelectedConfigurationIndex(index)}
          />
        ))}
      </div>

      <button
        type="button"
        disabled={
          saving ||
          selectedConfigurationIndex === null ||
          !selectedVehicle?.configurations[selectedConfigurationIndex ?? -1]
        }
        onClick={() => void handleSave()}
        className="w-full rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.92rem] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-45 touch-manipulation"
      >
        {saving ? "Speichern …" : saveLabel}
      </button>
    </section>
  );
}
