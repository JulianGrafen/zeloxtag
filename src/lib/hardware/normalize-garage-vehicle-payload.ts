import type { PendingGarageVehicle } from "@/lib/hardware/pending-garage-vehicle";
import {
  normalizeClaimTechSpecs,
  type ClaimTechSpecsInput,
} from "@/lib/tags/claim-tech-specs";

export type GarageVehiclePayloadInput = {
  make: string;
  model: string;
  year: string;
  vin?: string;
  techSpecs?: ClaimTechSpecsInput;
  name?: string;
};

function normalizeVin(raw: string | undefined): string | null {
  const vin = raw?.trim().toUpperCase() ?? "";
  if (!vin) return null;
  if (vin.length < 5 || vin.length > 32) {
    throw new Error("VIN muss zwischen 5 und 32 Zeichen liegen.");
  }
  return vin;
}

export function normalizeGarageVehiclePayload(
  input: GarageVehiclePayloadInput,
): PendingGarageVehicle {
  const make = input.make.trim();
  const model = input.model.trim();
  const year = Number.parseInt(input.year, 10);
  const name = input.name?.trim() || null;

  if (!make) throw new Error("Marke ist erforderlich.");
  if (!model) throw new Error("Modell ist erforderlich.");
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    throw new Error("Baujahr muss zwischen 1900 und 2100 liegen.");
  }

  return {
    make,
    model,
    year,
    vin: normalizeVin(input.vin),
    email: "",
    name,
    techSpecs: normalizeClaimTechSpecs(input.techSpecs),
  };
}
