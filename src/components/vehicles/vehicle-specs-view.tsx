"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Save } from "lucide-react";

import { updateVehicleSpecs } from "@/actions/update-vehicle-specs";
import { IOSListPage, InsetGroupedCard, InsetListRow } from "@/components/ui/ios";
import { FixedBottomActionBar } from "@/components/vehicle-dashboard/fixed-bottom-action-bar";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import {
  SpecInputRow,
  SpecSelectRow,
  SpecTextArea,
  SpecYearRow,
} from "@/components/vehicles/vehicle-specs-form-rows";
import { VehicleSpecsReadSections } from "@/components/vehicles/vehicle-specs-read-sections";
import {
  DEFAULT_OIL_INTERVAL_MONTHS,
  resolveOilChangeInterval,
} from "@/lib/documents/oil-changes";
import { formatMileageKmNumber } from "@/lib/documents/format";
import { silhouetteDisplayUrl } from "@/lib/vehicles/silhouette-display-url";
import { readSilhouetteVersionFromSession } from "@/lib/vehicles/silhouette-session";
import {
  ACCEL_0_100_SEC_MAX,
  ACCEL_0_100_SEC_MIN,
  ACCEL_100_200_SEC_MAX,
  ACCEL_100_200_SEC_MIN,
  formatAccelSecondsInput,
  formatOilChangeIntervalMonthsLabel,
  isAccelSecondsInputDraft,
  isOilChangeIntervalKmOption,
  isOilChangeIntervalMonthsOption,
  parseAccelSecondsFromDraft,
  OIL_CHANGE_INTERVAL_KM_OPTIONS,
  OIL_CHANGE_INTERVAL_MONTHS_OPTIONS,
  parseVehicleTechSpecs,
  VEHICLE_DRIVETRAIN_TYPES,
  VEHICLE_FUEL_TYPES,
  type VehicleTechSpecs,
} from "@/lib/vehicles/tech-specs";
import { showSavedToast } from "@/lib/ui/saved-toast";
import type { Vehicle } from "@/types/database";

type VehicleSpecsViewProps = {
  tagUuid: string;
  vehicle: Vehicle;
  canEdit: boolean;
};

type EditableSpecKey = Exclude<
  keyof VehicleTechSpecs,
  "buildPersonalityTags" | "dynoChartUrl"
>;

const SPECS_FORM_ID = "vehicle-tech-specs-form";
const ACCEL_HINT_ID = "vehicle-specs-accel-hint";

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
  const [accel0To100Text, setAccel0To100Text] = useState(
    formatAccelSecondsInput(initialSpecs.accel0To100Sec),
  );
  const [accel100To200Text, setAccel100To200Text] = useState(
    formatAccelSecondsInput(initialSpecs.accel100To200Sec),
  );
  const [error, setError] = useState<string | null>(null);
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
        key === "displacementCc" ||
        key === "vmaxKmh" ||
        key === "oilChangeIntervalKm" ||
        key === "oilChangeIntervalMonths"
      ) {
        const digits = value.replace(/[^\d]/g, "");
        return {
          ...prev,
          [key]: digits ? Number.parseInt(digits, 10) : null,
        };
      }
      return { ...prev, [key]: value || null };
    });
  }

  function specField(key: EditableSpecKey) {
    return {
      value: specs[key] ?? "",
      onChange: (
        event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
      ) => patchSpec(key, event.target.value),
    };
  }

  function patchAccel0To100Text(value: string) {
    if (!isAccelSecondsInputDraft(value)) return;
    setAccel0To100Text(value);
    setSpecs((prev) => ({
      ...prev,
      accel0To100Sec: parseAccelSecondsFromDraft(
        value,
        ACCEL_0_100_SEC_MIN,
        ACCEL_0_100_SEC_MAX,
      ),
    }));
  }

  function patchAccel100To200Text(value: string) {
    if (!isAccelSecondsInputDraft(value)) return;
    setAccel100To200Text(value);
    setSpecs((prev) => ({
      ...prev,
      accel100To200Sec: parseAccelSecondsFromDraft(
        value,
        ACCEL_100_200_SEC_MIN,
        ACCEL_100_200_SEC_MAX,
      ),
    }));
  }

  function commitAccel0To100Text() {
    const parsed = parseAccelSecondsFromDraft(
      accel0To100Text,
      ACCEL_0_100_SEC_MIN,
      ACCEL_0_100_SEC_MAX,
    );
    setSpecs((prev) => ({ ...prev, accel0To100Sec: parsed }));
    setAccel0To100Text(formatAccelSecondsInput(parsed));
  }

  function commitAccel100To200Text() {
    const parsed = parseAccelSecondsFromDraft(
      accel100To200Text,
      ACCEL_100_200_SEC_MIN,
      ACCEL_100_200_SEC_MAX,
    );
    setSpecs((prev) => ({ ...prev, accel100To200Sec: parsed }));
    setAccel100To200Text(formatAccelSecondsInput(parsed));
  }

  function handleSave() {
    setError(null);
    const accel0To100Sec = parseAccelSecondsFromDraft(
      accel0To100Text,
      ACCEL_0_100_SEC_MIN,
      ACCEL_0_100_SEC_MAX,
    );
    const accel100To200Sec = parseAccelSecondsFromDraft(
      accel100To200Text,
      ACCEL_100_200_SEC_MIN,
      ACCEL_100_200_SEC_MAX,
    );
    const techSpecs: VehicleTechSpecs = {
      ...specs,
      accel0To100Sec,
      accel100To200Sec,
    };
    setSpecs(techSpecs);
    setAccel0To100Text(formatAccelSecondsInput(accel0To100Sec));
    setAccel100To200Text(formatAccelSecondsInput(accel100To200Sec));
    startTransition(async () => {
      const result = await updateVehicleSpecs({
        vehicleId: vehicle.id,
        tagUuid,
        make,
        model,
        year,
        vin,
        techSpecs,
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      showSavedToast();
      router.refresh();
    });
  }

  const title = `${make.trim() || vehicle.make} ${model.trim() || vehicle.model}`;
  const profilePhotoUrl = vehicle.silhouette_image_url?.trim()
    ? silhouetteDisplayUrl(
        vehicle.id,
        vehicle.updated_at ??
          readSilhouetteVersionFromSession(vehicle.id) ??
          undefined,
      )
    : null;
  const oilInterval = resolveOilChangeInterval(specs);
  const oilIntervalLabel = `${formatMileageKmNumber(oilInterval.intervalKm)} km · ${oilInterval.intervalMonths} Monate`;
  const oilIntervalKmSelectValue = String(
    specs.oilChangeIntervalKm ?? oilInterval.intervalKm,
  );
  const oilIntervalMonthsSelectValue = String(
    specs.oilChangeIntervalMonths ?? oilInterval.intervalMonths,
  );

  function patchOilChangeIntervalKm(raw: string) {
    const km = Number.parseInt(raw, 10);
    setSpecs((prev) => ({
      ...prev,
      oilChangeIntervalKm: isOilChangeIntervalKmOption(km) ? km : null,
      oilChangeIntervalMonths:
        prev.oilChangeIntervalMonths ?? DEFAULT_OIL_INTERVAL_MONTHS,
    }));
  }

  function patchOilChangeIntervalMonths(raw: string) {
    const months = Number.parseInt(raw, 10);
    setSpecs((prev) => ({
      ...prev,
      oilChangeIntervalMonths: isOilChangeIntervalMonthsOption(months)
        ? months
        : null,
      oilChangeIntervalKm:
        prev.oilChangeIntervalKm ?? resolveOilChangeInterval(prev).intervalKm,
    }));
  }

  const saveBar = canEdit ? (
    <FixedBottomActionBar portal variant="ios">
      <PressableButton
        type="submit"
        form={SPECS_FORM_ID}
        variant="button"
        disabled={pending}
        className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-white text-[15px] font-semibold text-black disabled:opacity-60"
      >
        <Save className="h-4 w-4" aria-hidden />
        {pending ? "Speichern…" : "Speichern"}
      </PressableButton>
    </FixedBottomActionBar>
  ) : null;

  return (
    <IOSListPage
      title="Fahrzeugdaten"
      subtitle={title}
      backHref={`/v/${tagUuid}`}
      overlay={saveBar}
    >
      {error ? (
        <p role="alert" className="px-4 text-[13px] text-[#FF453A]">
          {error}
        </p>
      ) : null}

      <InsetGroupedCard>
        <InsetListRow
          href={`/v/${tagUuid}/daten/fahrzeugbild`}
          icon={ImageIcon}
          iconTone="blue"
          emphasis="navigation"
          label="Fahrzeugbild"
          value={profilePhotoUrl ? "Hinterlegt" : "Kein Foto"}
        />
      </InsetGroupedCard>

      {canEdit ? (
        <form
          id={SPECS_FORM_ID}
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <InsetGroupedCard header="Stammdaten">
            <SpecInputRow
              id="vehicle-make"
              label="Marke"
              required
              value={make}
              onChange={(event) => setMake(event.target.value)}
              placeholder="Toyota"
            />
            <SpecInputRow
              id="vehicle-model"
              label="Modell"
              required
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="Supra"
            />
            <SpecYearRow
              id="vehicle-year"
              label="Baujahr"
              value={year}
              onChange={setYear}
              required
            />
            <SpecInputRow
              id="vehicle-vin"
              label="VIN"
              mono
              value={vin}
              onChange={(event) => setVin(event.target.value.toUpperCase())}
              placeholder="optional"
              autoCapitalize="characters"
            />
          </InsetGroupedCard>

          <InsetGroupedCard header="Motor & Leistung">
            <SpecInputRow
              id="spec-engine"
              label="Motor"
              {...specField("engine")}
              placeholder="z. B. 3.0 Twin-Turbo"
            />
            <SpecInputRow
              id="spec-power-ps"
              label="Leistung (PS)"
              inputMode="numeric"
              {...specField("powerPs")}
              placeholder="231"
            />
            <SpecInputRow
              id="spec-power-kw"
              label="Leistung (kW)"
              inputMode="numeric"
              {...specField("powerKw")}
              placeholder="170"
            />
            <SpecInputRow
              id="spec-torque"
              label="Drehmoment"
              unit="Nm"
              inputMode="numeric"
              {...specField("torqueNm")}
              placeholder="350"
            />
            <SpecInputRow
              id="spec-displacement"
              label="Hubraum"
              unit="ccm"
              inputMode="numeric"
              {...specField("displacementCc")}
              placeholder="1308"
            />
          </InsetGroupedCard>

          <InsetGroupedCard
            header="Fahrleistungen"
            footer={
              <span id={ACCEL_HINT_ID}>
                Beschleunigungszeiten in Sekunden, V-Max in km/h (optional).
              </span>
            }
          >
            <SpecInputRow
              id="spec-accel-0-100"
              label="0–100 km/h"
              unit="s"
              inputMode="decimal"
              value={accel0To100Text}
              onChange={(event) => patchAccel0To100Text(event.target.value)}
              onBlur={commitAccel0To100Text}
              placeholder="5,2"
              aria-describedby={ACCEL_HINT_ID}
            />
            <SpecInputRow
              id="spec-accel-100-200"
              label="100–200 km/h"
              unit="s"
              inputMode="decimal"
              value={accel100To200Text}
              onChange={(event) => patchAccel100To200Text(event.target.value)}
              onBlur={commitAccel100To200Text}
              placeholder="12,4"
              aria-describedby={ACCEL_HINT_ID}
            />
            <SpecInputRow
              id="spec-vmax"
              label="V-Max"
              unit="km/h"
              inputMode="numeric"
              {...specField("vmaxKmh")}
              placeholder="265"
            />
          </InsetGroupedCard>

          <InsetGroupedCard header="Antrieb & Karosserie">
            <SpecSelectRow id="spec-fuel" label="Kraftstoff" {...specField("fuelType")}>
              <option value="">—</option>
              {VEHICLE_FUEL_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SpecSelectRow>
            <SpecInputRow
              id="spec-transmission"
              label="Getriebe"
              {...specField("transmission")}
              placeholder="6-Gang manuell"
            />
            <SpecSelectRow id="spec-drivetrain" label="Antrieb" {...specField("drivetrain")}>
              <option value="">—</option>
              {VEHICLE_DRIVETRAIN_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SpecSelectRow>
            <SpecInputRow
              id="spec-body"
              label="Karosserie"
              {...specField("bodyType")}
              placeholder="Coupé"
            />
            <SpecInputRow
              id="spec-color"
              label="Farbe"
              {...specField("color")}
              placeholder="Velocity Red"
            />
          </InsetGroupedCard>

          <InsetGroupedCard header="Öffentlich">
            <SpecInputRow
              id="spec-instagram"
              label="Instagram"
              {...specField("instagramHandle")}
              placeholder="@julian_f11"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </InsetGroupedCard>

          <InsetGroupedCard header="Spezifikationen">
            <SpecTextArea
              rows={3}
              aria-label="Spezifikationen"
              {...specField("notes")}
              placeholder="Serienstand, Besonderheiten…"
            />
          </InsetGroupedCard>

          <InsetGroupedCard
            header="Wartung"
            footer="Für die Fälligkeit auf der Ölwechsel-Seite — wird beim Registrieren übernommen und kann hier angepasst werden."
          >
            <SpecSelectRow
              id="oil-interval-km"
              label="Intervall"
              value={oilIntervalKmSelectValue}
              onChange={(event) => patchOilChangeIntervalKm(event.target.value)}
            >
              {OIL_CHANGE_INTERVAL_KM_OPTIONS.map((km) => (
                <option key={km} value={String(km)}>
                  {formatMileageKmNumber(km)} km
                </option>
              ))}
            </SpecSelectRow>
            <SpecSelectRow
              id="oil-interval-months"
              label="Zeitintervall"
              value={oilIntervalMonthsSelectValue}
              onChange={(event) => patchOilChangeIntervalMonths(event.target.value)}
            >
              {OIL_CHANGE_INTERVAL_MONTHS_OPTIONS.map((months) => (
                <option key={months} value={String(months)}>
                  {formatOilChangeIntervalMonthsLabel(months)}
                </option>
              ))}
            </SpecSelectRow>
          </InsetGroupedCard>
        </form>
      ) : (
        <VehicleSpecsReadSections
          vehicle={vehicle}
          specs={specs}
          oilIntervalLabel={oilIntervalLabel}
        />
      )}
    </IOSListPage>
  );
}
