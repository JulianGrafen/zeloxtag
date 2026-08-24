"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Gauge, Save } from "lucide-react";

import { updateVehicleSpecs } from "@/actions/update-vehicle-specs";
import { VehicleDynoChartUpload } from "@/components/vehicles/vehicle-dyno-chart-upload";
import { VehicleSilhouetteUpload } from "@/components/onboarding/VehicleSilhouetteUpload";
import type { SilhouetteUploadResult } from "@/components/onboarding/VehicleSilhouetteUpload";
import {
  PressableButton,
  PressableLink,
} from "@/components/vehicle-dashboard/Pressable";
import { writeSilhouetteToSession } from "@/lib/vehicles/silhouette-session";
import {
  parseVehicleTechSpecs,
  type VehicleTechSpecs,
} from "@/lib/vehicles/tech-specs";
import type { Vehicle } from "@/types/database";

type VehicleSpecsViewProps = {
  tagUuid: string;
  vehicle: Vehicle;
  canEdit: boolean;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[color:var(--vd-border)] px-4 py-3 last:border-b-0">
      <span className="text-[0.78rem] text-[color:var(--vd-muted)]">{label}</span>
      <span className="text-right text-[0.88rem] font-medium text-[color:var(--vd-text)]">
        {value}
      </span>
    </div>
  );
}

export function VehicleSpecsView({
  tagUuid,
  vehicle,
  canEdit,
}: VehicleSpecsViewProps) {
  const router = useRouter();
  const initialSpecs = parseVehicleTechSpecs(vehicle.tech_specs);
  const [make, setMake] = useState(vehicle.make);
  const [model, setModel] = useState(vehicle.model);
  const [year, setYear] = useState(
    vehicle.year != null ? String(vehicle.year) : "",
  );
  const [vin, setVin] = useState(vehicle.vin ?? "");
  const [specs, setSpecs] = useState<VehicleTechSpecs>(initialSpecs);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function patchSpec<K extends keyof VehicleTechSpecs>(
    key: K,
    value: string,
  ) {
    setSpecs((prev) => {
      if (
        key === "powerPs" ||
        key === "powerKw" ||
        key === "torqueNm" ||
        key === "displacementCc"
      ) {
        const digits = value.replace(/[^\d]/g, "");
        return {
          ...prev,
          [key]: digits ? Number.parseInt(digits, 10) : null,
        };
      }
      return { ...prev, [key]: value };
    });
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateVehicleSpecs({
        vehicleId: vehicle.id,
        tagUuid,
        make,
        model,
        year,
        vin,
        techSpecs: specs,
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  const title = `${make.trim() || vehicle.make} ${model.trim() || vehicle.model}`;

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <header className="vd-anim-header space-y-4">
          <PressableLink
            href={`/v/${tagUuid}`}
            variant="pill"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Dashboard
          </PressableLink>

          <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
              <Gauge className="h-5 w-5" aria-hidden />
            </div>
            <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
              Fahrzeugakte
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
              Technische Daten
            </h1>
            <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
              {title}
              {year ? ` · ${year}` : ""}
            </p>
          </div>
        </header>

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
          >
            {error}
          </p>
        ) : null}
        {saved ? (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 px-3 py-2.5 text-[0.8rem] text-emerald-800"
          >
            Gespeichert.
          </p>
        ) : null}

        {canEdit ? (
          <VehicleSilhouetteUpload
            vehicleId={vehicle.id}
            tagUuid={tagUuid}
            onUploaded={(result: SilhouetteUploadResult) => {
              writeSilhouetteToSession(vehicle.id, result.storageUrl);
              router.refresh();
            }}
          />
        ) : null}

        <VehicleDynoChartUpload
          vehicleId={vehicle.id}
          tagUuid={tagUuid}
          dynoChartUrl={specs.dynoChartUrl}
          canEdit={canEdit}
          onUploaded={(url) => {
            setSpecs((prev) => ({ ...prev, dynoChartUrl: url }));
            router.refresh();
          }}
        />

        {canEdit ? (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              handleSave();
            }}
          >
            <section className="space-y-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
              <h2 className="font-[family-name:var(--font-display)] text-[1rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
                Stammdaten
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Marke">
                  <input
                    required
                    value={make}
                    onChange={(event) => {
                      setMake(event.target.value);
                      setSaved(false);
                    }}
                    className="claim-input w-full"
                    placeholder="Toyota"
                  />
                </Field>
                <Field label="Modell">
                  <input
                    required
                    value={model}
                    onChange={(event) => {
                      setModel(event.target.value);
                      setSaved(false);
                    }}
                    className="claim-input w-full"
                    placeholder="Supra"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Baujahr">
                  <input
                    required
                    inputMode="numeric"
                    value={year}
                    onChange={(event) => {
                      setYear(event.target.value);
                      setSaved(false);
                    }}
                    className="claim-input w-full"
                    placeholder="2011"
                  />
                </Field>
                <Field label="VIN">
                  <input
                    value={vin}
                    onChange={(event) => {
                      setVin(event.target.value.toUpperCase());
                      setSaved(false);
                    }}
                    className="claim-input w-full font-mono text-[0.85rem]"
                    placeholder="optional"
                    autoCapitalize="characters"
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
              <h2 className="font-[family-name:var(--font-display)] text-[1rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
                Antrieb & Fahrwerk
              </h2>
              <Field label="Motor / Aggregat">
                <input
                  value={specs.engine ?? ""}
                  onChange={(event) => patchSpec("engine", event.target.value)}
                  className="claim-input w-full"
                  placeholder="z. B. 3.0 Twin-Turbo (2JZ-GTE)"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="PS">
                  <input
                    inputMode="numeric"
                    value={specs.powerPs ?? ""}
                    onChange={(event) =>
                      patchSpec("powerPs", event.target.value)
                    }
                    className="claim-input w-full"
                    placeholder="231"
                  />
                </Field>
                <Field label="kW">
                  <input
                    inputMode="numeric"
                    value={specs.powerKw ?? ""}
                    onChange={(event) =>
                      patchSpec("powerKw", event.target.value)
                    }
                    className="claim-input w-full"
                    placeholder="170"
                  />
                </Field>
                <Field label="Nm">
                  <input
                    inputMode="numeric"
                    value={specs.torqueNm ?? ""}
                    onChange={(event) =>
                      patchSpec("torqueNm", event.target.value)
                    }
                    className="claim-input w-full"
                    placeholder="350"
                  />
                </Field>
                <Field label="ccm">
                  <input
                    inputMode="numeric"
                    value={specs.displacementCc ?? ""}
                    onChange={(event) =>
                      patchSpec("displacementCc", event.target.value)
                    }
                    className="claim-input w-full"
                    placeholder="1308"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kraftstoff">
                  <input
                    value={specs.fuelType ?? ""}
                    onChange={(event) =>
                      patchSpec("fuelType", event.target.value)
                    }
                    className="claim-input w-full"
                    placeholder="Benzin"
                  />
                </Field>
                <Field label="Getriebe">
                  <input
                    value={specs.transmission ?? ""}
                    onChange={(event) =>
                      patchSpec("transmission", event.target.value)
                    }
                    className="claim-input w-full"
                    placeholder="6-Gang manuell"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Antrieb">
                  <input
                    value={specs.drivetrain ?? ""}
                    onChange={(event) =>
                      patchSpec("drivetrain", event.target.value)
                    }
                    className="claim-input w-full"
                    placeholder="Heckantrieb"
                  />
                </Field>
                <Field label="Karosserie">
                  <input
                    value={specs.bodyType ?? ""}
                    onChange={(event) =>
                      patchSpec("bodyType", event.target.value)
                    }
                    className="claim-input w-full"
                    placeholder="Coupé"
                  />
                </Field>
              </div>
              <Field label="Farbe">
                <input
                  value={specs.color ?? ""}
                  onChange={(event) => patchSpec("color", event.target.value)}
                  className="claim-input w-full"
                  placeholder="Velocity Red"
                />
              </Field>
              <Field label="Instagram (öffentlich)">
                <input
                  value={specs.instagramHandle ?? ""}
                  onChange={(event) =>
                    patchSpec("instagramHandle", event.target.value)
                  }
                  className="claim-input w-full"
                  placeholder="@julian_f11"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </Field>
              <Field label="Spezifikationen">
                <textarea
                  rows={3}
                  value={specs.notes ?? ""}
                  onChange={(event) => patchSpec("notes", event.target.value)}
                  className="claim-input w-full resize-none"
                  placeholder="Serienstand, Besonderheiten…"
                />
              </Field>
            </section>

            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="pointer-events-auto w-full max-w-lg">
                <PressableButton
                  type="submit"
                  variant="button"
                  disabled={pending}
                  className="claim-cta inline-flex w-full items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" aria-hidden />
                  {pending ? "Speichern…" : "Speichern"}
                </PressableButton>
              </div>
            </div>
          </form>
        ) : (
          <section className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)]">
            <ReadRow label="Marke" value={vehicle.make} />
            <ReadRow label="Modell" value={vehicle.model} />
            <ReadRow
              label="Baujahr"
              value={vehicle.year != null ? String(vehicle.year) : "—"}
            />
            {vehicle.vin ? <ReadRow label="VIN" value={vehicle.vin} /> : null}
            {specs.engine ? (
              <ReadRow label="Motor" value={specs.engine} />
            ) : null}
            {specs.powerPs != null || specs.powerKw != null ? (
              <ReadRow
                label="Leistung"
                value={[
                  specs.powerPs != null ? `${specs.powerPs} PS` : null,
                  specs.powerKw != null ? `${specs.powerKw} kW` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ) : null}
            {specs.torqueNm != null ? (
              <ReadRow label="Drehmoment" value={`${specs.torqueNm} Nm`} />
            ) : null}
            {specs.displacementCc != null ? (
              <ReadRow label="Hubraum" value={`${specs.displacementCc} ccm`} />
            ) : null}
            {specs.fuelType ? (
              <ReadRow label="Kraftstoff" value={specs.fuelType} />
            ) : null}
            {specs.transmission ? (
              <ReadRow label="Getriebe" value={specs.transmission} />
            ) : null}
            {specs.drivetrain ? (
              <ReadRow label="Antrieb" value={specs.drivetrain} />
            ) : null}
            {specs.bodyType ? (
              <ReadRow label="Karosserie" value={specs.bodyType} />
            ) : null}
            {specs.color ? <ReadRow label="Farbe" value={specs.color} /> : null}
            {specs.instagramHandle ? (
              <ReadRow label="Instagram" value={`@${specs.instagramHandle}`} />
            ) : null}
            {specs.notes ? (
              <ReadRow label="Spezifikationen" value={specs.notes} />
            ) : null}
          </section>
        )}
      </div>
    </div>
  );
}
