"use client";

import { buildFuelConsumptionByEntryId } from "@/lib/vehicles/operating-costs/fuel-consumption";
import type { VehicleOperatingCost } from "@/types/database";
import { formatCurrencyEUR } from "@/utils/formatters";

import {
  IOS_SECTION_HEADER,
  IOSEmptyState,
  InsetGroupedCard,
  InsetListRow,
} from "@/components/ui/ios";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

import {
  OPERATING_COST_CATEGORY_ICONS,
  OPERATING_COST_CATEGORY_TONES,
} from "./operating-cost-category-visuals";
import { describeOperatingCostEntry } from "./operating-cost-entry-display";

type OperatingCostEntryListProps = {
  entries: VehicleOperatingCost[];
  vehicleSurfaceScope: VehicleSurfaceScope;
  header?: string;
  readOnly?: boolean;
  fuelOnly?: boolean;
};

function resolveEntryDetailHref(
  entry: VehicleOperatingCost,
  vehicleSurfaceScope: VehicleSurfaceScope,
  readOnly: boolean,
): string | undefined {
  if (readOnly) return undefined;
  const segment = entry.category === "fuel" ? "tanken" : "kosten";
  return vehicleSurfaceHref(vehicleSurfaceScope, `${segment}/${entry.id}`);
}

function OperatingCostEntryRow({
  entry,
  href,
  litersPer100Km,
}: {
  entry: VehicleOperatingCost;
  href?: string;
  litersPer100Km: number | null;
}) {
  const { title, meta } = describeOperatingCostEntry(entry, litersPer100Km);
  return (
    <InsetListRow
      href={href}
      emphasis="item"
      icon={OPERATING_COST_CATEGORY_ICONS[entry.category]}
      iconTone={OPERATING_COST_CATEGORY_TONES[entry.category]}
      label={title}
      sublabel={meta || undefined}
      value={formatCurrencyEUR(Number(entry.amount_eur))}
      valueVariant="numeric"
    />
  );
}

export function OperatingCostEntryList({
  entries,
  vehicleSurfaceScope,
  header,
  readOnly = false,
  fuelOnly = false,
}: OperatingCostEntryListProps) {
  if (entries.length === 0) {
    return (
      <section>
        {header ? <h2 className={IOS_SECTION_HEADER}>{header}</h2> : null}
        <IOSEmptyState>
          {fuelOnly
            ? "Noch keine Tankungen eingetragen."
            : "Noch keine Kosten eingetragen."}
        </IOSEmptyState>
      </section>
    );
  }

  const consumptionByEntryId = fuelOnly
    ? buildFuelConsumptionByEntryId(entries)
    : null;

  return (
    <InsetGroupedCard header={header}>
      {entries.map((entry) => (
        <OperatingCostEntryRow
          key={entry.id}
          entry={entry}
          href={resolveEntryDetailHref(entry, vehicleSurfaceScope, readOnly)}
          litersPer100Km={
            consumptionByEntryId?.get(entry.id)?.litersPer100Km ?? null
          }
        />
      ))}
    </InsetGroupedCard>
  );
}
