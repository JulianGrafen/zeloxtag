"use client";

import {
  InsetGroupedCard,
  InsetListRow,
  type InsetListRowValueVariant,
} from "@/components/ui/ios";
import { useRegionalFormatters } from "@/lib/i18n/hooks/use-regional-formatters";
import { formatAccelSecondsDe, type VehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { Vehicle } from "@/types/database";

type SpecReadRow = {
  label: string;
  value: string | null;
  variant?: InsetListRowValueVariant;
};

type SpecReadSection = {
  header: string;
  rows: SpecReadRow[];
};

type VehicleSpecsReadSectionsProps = {
  vehicle: Vehicle;
  specs: VehicleTechSpecs;
  oilIntervalLabel: string;
};

const GERMAN_NUMBER = new Intl.NumberFormat("de-DE");

function withUnit(value: number | null, unit: string): string | null {
  return value != null ? `${GERMAN_NUMBER.format(value)} ${unit}` : null;
}

function joinPresent(parts: (string | null)[]): string | null {
  const present = parts.filter((part): part is string => Boolean(part));
  return present.length > 0 ? present.join(" · ") : null;
}

function useSpecReadSections({
  vehicle,
  specs,
  oilIntervalLabel,
}: VehicleSpecsReadSectionsProps): SpecReadSection[] {
  const { formatPowerFromPs, formatPowerLabel } = useRegionalFormatters();

  return [
    {
      header: "Stammdaten",
      rows: [
        { label: "Marke", value: vehicle.make },
        { label: "Modell", value: vehicle.model },
        {
          label: "Baujahr",
          value: vehicle.year != null ? String(vehicle.year) : "—",
          variant: "numeric",
        },
        { label: "VIN", value: vehicle.vin, variant: "mono" },
      ],
    },
    {
      header: "Motor & Leistung",
      rows: [
        { label: "Motor", value: specs.engine },
        {
          label: formatPowerLabel(),
          value: joinPresent([
            specs.powerPs != null ? formatPowerFromPs(specs.powerPs) : null,
            withUnit(specs.powerKw, "kW"),
          ]),
          variant: "numeric",
        },
        { label: "Drehmoment", value: withUnit(specs.torqueNm, "Nm"), variant: "numeric" },
        { label: "Hubraum", value: withUnit(specs.displacementCc, "ccm"), variant: "numeric" },
      ],
    },
    {
      header: "Fahrleistungen",
      rows: [
        {
          label: "0–100 km/h",
          value: specs.accel0To100Sec != null ? formatAccelSecondsDe(specs.accel0To100Sec) : null,
          variant: "numeric",
        },
        {
          label: "100–200 km/h",
          value:
            specs.accel100To200Sec != null ? formatAccelSecondsDe(specs.accel100To200Sec) : null,
          variant: "numeric",
        },
        { label: "V-Max", value: withUnit(specs.vmaxKmh, "km/h"), variant: "numeric" },
      ],
    },
    {
      header: "Antrieb & Karosserie",
      rows: [
        { label: "Kraftstoff", value: specs.fuelType },
        { label: "Getriebe", value: specs.transmission },
        { label: "Antrieb", value: specs.drivetrain },
        { label: "Karosserie", value: specs.bodyType },
        { label: "Farbe", value: specs.color },
        {
          label: "Instagram",
          value: specs.instagramHandle ? `@${specs.instagramHandle}` : null,
        },
      ],
    },
    {
      header: "Wartung",
      rows: [{ label: "Ölwechsel-Intervall", value: oilIntervalLabel, variant: "numeric" }],
    },
  ];
}

export function VehicleSpecsReadSections(props: VehicleSpecsReadSectionsProps) {
  const sections = useSpecReadSections(props);
  const notes = props.specs.notes?.trim();

  return (
    <>
      {sections.map(({ header, rows }) => {
        const visibleRows = rows.filter((row) => row.value);
        if (visibleRows.length === 0) return null;
        return (
          <InsetGroupedCard key={header} header={header}>
            {visibleRows.map((row) => (
              <InsetListRow
                key={row.label}
                emphasis="data"
                label={row.label}
                value={row.value}
                valueVariant={row.variant ?? "text"}
              />
            ))}
          </InsetGroupedCard>
        );
      })}
      {notes ? (
        <InsetGroupedCard header="Spezifikationen">
          <p className="whitespace-pre-line px-4 py-3 text-[15px] leading-snug text-white">
            {notes}
          </p>
        </InsetGroupedCard>
      ) : null}
    </>
  );
}
