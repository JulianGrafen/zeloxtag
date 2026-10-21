import { MOCK_DEMO_VEHICLE_ID } from "@/lib/tags/mock-tags";
import type { VehicleOperatingCost } from "@/types/database";

const DEMO_USER_ID = "user_demo";
const DEMO_TS = "2026-03-12T10:00:00.000Z";

/** Read-only Betriebskosten für den E36-Demo-Zwilling. */
export const MOCK_DEMO_OPERATING_COSTS: VehicleOperatingCost[] = [
  {
    id: "demo_cost_fuel_1",
    vehicle_id: MOCK_DEMO_VEHICLE_ID,
    user_id: DEMO_USER_ID,
    category: "fuel",
    amount_eur: 58.42,
    occurred_on: "2026-03-08",
    billing_period: "once",
    note: "Super E10 · Shell Autobahn A9",
    fuel_liters: 42.8,
    odometer_km: 162_340,
    created_at: DEMO_TS,
    updated_at: DEMO_TS,
  },
  {
    id: "demo_cost_fuel_2",
    vehicle_id: MOCK_DEMO_VEHICLE_ID,
    user_id: DEMO_USER_ID,
    category: "fuel",
    amount_eur: 61.15,
    occurred_on: "2026-02-12",
    billing_period: "once",
    note: "Super Plus · Aral Stadt",
    fuel_liters: 44.2,
    odometer_km: 161_880,
    created_at: DEMO_TS,
    updated_at: DEMO_TS,
  },
  {
    id: "demo_cost_fuel_3",
    vehicle_id: MOCK_DEMO_VEHICLE_ID,
    user_id: DEMO_USER_ID,
    category: "fuel",
    amount_eur: 54.9,
    occurred_on: "2026-01-18",
    billing_period: "once",
    note: "Super E5 · TotalEnergies",
    fuel_liters: 39.6,
    odometer_km: 161_420,
    created_at: DEMO_TS,
    updated_at: DEMO_TS,
  },
  {
    id: "demo_cost_fuel_4",
    vehicle_id: MOCK_DEMO_VEHICLE_ID,
    user_id: DEMO_USER_ID,
    category: "fuel",
    amount_eur: 63.7,
    occurred_on: "2025-12-21",
    billing_period: "once",
    note: "100 Oktan · Trackday Hockenheim Hin-/Rückfahrt",
    fuel_liters: 46.1,
    odometer_km: 160_950,
    created_at: DEMO_TS,
    updated_at: DEMO_TS,
  },
  {
    id: "demo_cost_fuel_5",
    vehicle_id: MOCK_DEMO_VEHICLE_ID,
    user_id: DEMO_USER_ID,
    category: "fuel",
    amount_eur: 57.25,
    occurred_on: "2025-11-29",
    billing_period: "once",
    note: "Super E10 · Jet",
    fuel_liters: 41.3,
    odometer_km: 160_510,
    created_at: DEMO_TS,
    updated_at: DEMO_TS,
  },
  {
    id: "demo_cost_fuel_6",
    vehicle_id: MOCK_DEMO_VEHICLE_ID,
    user_id: DEMO_USER_ID,
    category: "fuel",
    amount_eur: 52.4,
    occurred_on: "2025-10-15",
    billing_period: "once",
    note: "Super E5 · Esso",
    fuel_liters: 38.9,
    odometer_km: 160_080,
    created_at: DEMO_TS,
    updated_at: DEMO_TS,
  },
  {
    id: "demo_cost_insurance",
    vehicle_id: MOCK_DEMO_VEHICLE_ID,
    user_id: DEMO_USER_ID,
    category: "insurance",
    amount_eur: 89,
    occurred_on: "2026-01-01",
    billing_period: "monthly",
    note: "Teilkasko · H-Kennzeichen · Oldtimer-Tarif",
    fuel_liters: null,
    odometer_km: null,
    created_at: DEMO_TS,
    updated_at: DEMO_TS,
  },
  {
    id: "demo_cost_tax",
    vehicle_id: MOCK_DEMO_VEHICLE_ID,
    user_id: DEMO_USER_ID,
    category: "tax",
    amount_eur: 318,
    occurred_on: "2026-01-15",
    billing_period: "yearly",
    note: "Kfz-Steuer · St.-Nr. BY",
    fuel_liters: null,
    odometer_km: null,
    created_at: DEMO_TS,
    updated_at: DEMO_TS,
  },
  {
    id: "demo_cost_parking",
    vehicle_id: MOCK_DEMO_VEHICLE_ID,
    user_id: DEMO_USER_ID,
    category: "other",
    amount_eur: 45,
    occurred_on: "2026-01-01",
    billing_period: "monthly",
    note: "Garagenstellplatz · Winterlager",
    fuel_liters: null,
    odometer_km: null,
    created_at: DEMO_TS,
    updated_at: DEMO_TS,
  },
];

export function isDemoOperatingCostVehicle(vehicleId: string): boolean {
  return vehicleId.trim() === MOCK_DEMO_VEHICLE_ID;
}

export function getDemoOperatingCostsForVehicle(
  vehicleId: string,
): VehicleOperatingCost[] {
  if (!isDemoOperatingCostVehicle(vehicleId)) {
    return [];
  }
  return MOCK_DEMO_OPERATING_COSTS.map((entry) => ({ ...entry }));
}
