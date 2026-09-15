import type { PostgrestError } from "@supabase/supabase-js";

import {
  VEHICLE_COLUMNS,
  VEHICLE_COLUMNS_BASE,
} from "@/lib/documents/query-columns";
import { withDefaultShowcaseFields } from "@/lib/vehicles/public-showcase-data";
import type { Vehicle } from "@/types/database";

export function isMissingVehicleBuildDnaColumnError(error: {
  message?: string;
}): boolean {
  const message = error.message ?? "";
  return message.includes("showcase_build_dna");
}

function normalizeVehicleRow(row: Record<string, unknown>): Vehicle {
  return withDefaultShowcaseFields(row as Vehicle);
}

type VehicleSelectResult = {
  data: Record<string, unknown> | null;
  error: PostgrestError | null;
};

type VehicleFilteredQuery = {
  eq: (column: string, value: string | boolean) => VehicleFilteredQuery;
  maybeSingle: () => Promise<VehicleSelectResult>;
};

function applyVehicleFilters(
  fromVehicles: { select: (columns: string) => unknown },
  columns: string,
  filter: { column: "id" | "public_slug"; value: string },
  and?: { column: string; value: string | boolean },
): Promise<VehicleSelectResult> {
  let query = fromVehicles.select(columns) as VehicleFilteredQuery;
  query = query.eq(filter.column, filter.value);
  if (and) {
    query = query.eq(and.column, and.value);
  }
  return query.maybeSingle();
}

/**
 * Loads one vehicle row with Build DNA columns when the migration exists;
 * falls back to the legacy projection and null DNA fields otherwise.
 */
export async function loadVehicleProjectionMaybeSingle(
  fromVehicles: { select: (columns: string) => unknown },
  filter: { column: "id" | "public_slug"; value: string },
  and?: { column: string; value: string | boolean },
): Promise<{ data: Vehicle | null; error: PostgrestError | null }> {
  const primary = await applyVehicleFilters(
    fromVehicles,
    VEHICLE_COLUMNS,
    filter,
    and,
  );

  if (!primary.error || !isMissingVehicleBuildDnaColumnError(primary.error)) {
    return {
      data: primary.data ? normalizeVehicleRow(primary.data) : null,
      error: primary.error,
    };
  }

  console.warn(
    "[vehicles] showcase_build_dna columns missing — apply migration 00063_vehicle_showcase_build_dna.sql",
  );

  const fallback = await applyVehicleFilters(
    fromVehicles,
    VEHICLE_COLUMNS_BASE,
    filter,
    and,
  );

  return {
    data: fallback.data ? normalizeVehicleRow(fallback.data) : null,
    error: fallback.error,
  };
}
