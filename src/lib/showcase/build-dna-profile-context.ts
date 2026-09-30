import { buildPersonalityLabels } from "@/lib/vehicles/build-personality-chips";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { Vehicle } from "@/types/database";

/** Owner text + structured tech data that should influence Build DNA. */
export type BuildDnaProfileContext = {
  make: string;
  model: string;
  year: number | null;
  engine: string | null;
  powerPs: number | null;
  powerKw: number | null;
  torqueNm: number | null;
  fuelType: string | null;
  transmission: string | null;
  drivetrain: string | null;
  notes: string | null;
  /** Combined specs + notes for LLM/heuristic scoring. */
  specificationsText: string | null;
  buildPersonalityLabels: string[];
};

export function buildBuildDnaProfileContext(
  vehicle: Pick<Vehicle, "make" | "model" | "year" | "tech_specs">,
): BuildDnaProfileContext {
  const specs = parseVehicleTechSpecs(vehicle.tech_specs);
  const personalityLabels = buildPersonalityLabels(
    specs.buildPersonalityTags ?? [],
  );

  const structuredParts = [
    specs.engine ? `Motor: ${specs.engine}` : null,
    specs.powerPs != null ? `Leistung: ${specs.powerPs} PS` : null,
    specs.powerKw != null ? `${specs.powerKw} kW` : null,
    specs.torqueNm != null ? `Drehmoment: ${specs.torqueNm} Nm` : null,
    specs.fuelType ? `Kraftstoff: ${specs.fuelType}` : null,
    specs.transmission ? `Getriebe: ${specs.transmission}` : null,
    specs.drivetrain ? `Antrieb: ${specs.drivetrain}` : null,
  ].filter((part): part is string => Boolean(part));

  const notes = specs.notes?.trim() ? specs.notes.trim() : null;
  const specificationSegments = [
    ...structuredParts,
    notes ? `Spezifikationen: ${notes}` : null,
    personalityLabels.length > 0
      ? `Build-Vibe: ${personalityLabels.join(", ")}`
      : null,
  ].filter((part): part is string => Boolean(part));

  return {
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    engine: specs.engine,
    powerPs: specs.powerPs,
    powerKw: specs.powerKw,
    torqueNm: specs.torqueNm,
    fuelType: specs.fuelType,
    transmission: specs.transmission,
    drivetrain: specs.drivetrain,
    notes,
    specificationsText:
      specificationSegments.length > 0
        ? specificationSegments.join(" · ")
        : null,
    buildPersonalityLabels: personalityLabels,
  };
}
