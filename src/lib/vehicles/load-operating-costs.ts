import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { VehicleOperatingCost } from "@/types/database";

function mapRow(row: Record<string, unknown>): VehicleOperatingCost {
  return {
    id: String(row.id),
    vehicle_id: String(row.vehicle_id),
    user_id: String(row.user_id),
    category: row.category as VehicleOperatingCost["category"],
    amount_eur: Number(row.amount_eur),
    occurred_on: String(row.occurred_on),
    billing_period: row.billing_period as VehicleOperatingCost["billing_period"],
    note: row.note != null ? String(row.note) : null,
    fuel_liters: row.fuel_liters != null ? Number(row.fuel_liters) : null,
    odometer_km: row.odometer_km != null ? Number(row.odometer_km) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listOperatingCostsForVehicle(
  vehicleId: string,
): Promise<VehicleOperatingCost[]> {
  const query = isSupabaseAdminConfigured()
    ? createAdminClient()
        .from("vehicle_operating_costs")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("occurred_on", { ascending: false })
    : (await createClient())
        .from("vehicle_operating_costs")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("occurred_on", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("[operating-costs] list failed", error);
    return [];
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}
