import { buildPersonalityLabels } from "@/lib/vehicles/build-personality-chips";
import { formatGermanDate } from "@/lib/vehicles/expose-pdf/formatters";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { Vehicle } from "@/types/database";

export function exposePersonalityLabelsFromVehicle(vehicle: Vehicle): string[] {
  const specs = parseVehicleTechSpecs(vehicle.tech_specs);
  return buildPersonalityLabels(specs.buildPersonalityTags ?? []);
}

export function formatExposeGeneratedAtLabel(isoDate: string): string {
  const day = isoDate.trim().slice(0, 10);
  return formatGermanDate(day);
}
