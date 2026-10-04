import "server-only";

import { buildBuildDnaProfileContext } from "@/lib/showcase/build-dna-profile-context";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { loadOwnerVehicleDocuments } from "@/lib/vehicles/load-owner-vehicle-documents";
import { loadVehicleProjectionMaybeSingle } from "@/lib/vehicles/load-vehicle-projection";
import {
  extractVehicleModifications,
  type VehicleModification,
} from "@/lib/vehicles/vehicle-modifications";
import type { Vehicle } from "@/types/database";

export type RoastModificationLine = {
  label: string;
  category: string;
  manufacturer: string | null;
  source: VehicleModification["source"];
};

export type VehicleRoastContext = {
  vehicleId: string;
  ownerUserId: string;
  vehicleLabel: string;
  year: number | null;
  engine: string | null;
  powerPs: number | null;
  fuelType: string | null;
  transmission: string | null;
  drivetrain: string | null;
  modifications: RoastModificationLine[];
  isStock: boolean;
  llmContext: string;
};

function mapModificationLine(mod: VehicleModification): RoastModificationLine {
  return {
    label: mod.partName.trim(),
    category: mod.category.trim(),
    manufacturer: mod.manufacturer?.trim() || null,
    source: mod.source,
  };
}

function formatLlmContext(input: {
  vehicleLabel: string;
  year: number | null;
  engine: string | null;
  powerPs: number | null;
  fuelType: string | null;
  transmission: string | null;
  drivetrain: string | null;
  modifications: RoastModificationLine[];
  isStock: boolean;
}): string {
  const lines = [
    `Fahrzeug: ${input.vehicleLabel}${input.year ? ` (${input.year})` : ""}`,
  ];

  if (input.engine) lines.push(`Motor: ${input.engine}`);
  if (input.powerPs != null) lines.push(`Leistung (Profil): ${input.powerPs} PS`);
  if (input.fuelType) lines.push(`Kraftstoff: ${input.fuelType}`);
  if (input.transmission) lines.push(`Getriebe: ${input.transmission}`);
  if (input.drivetrain) lines.push(`Antrieb: ${input.drivetrain}`);

  const modCount = input.modifications.length;
  lines.push("");
  if (input.isStock) {
    lines.push(
      "Verbaute Mods: keine dokumentiert — seriennah / Stock.",
    );
    lines.push(
      `Roast-Hinweis: Stock — Marke/Modell-Klischee, kein Spec-Block (keine Motorcodes, keine PS-Zahl, keine Antriebs-Liste).`,
    );
  } else {
    lines.push(`Verbaute Mods: ${modCount} dokumentiert (Garage/Belege):`);
    for (const mod of input.modifications.slice(0, 45)) {
      lines.push(`- ${mod.label}`);
    }
    lines.push(
      `Roast-Hinweis: ${modCount} Mods intern einordnen — Punchline mit Klischee + Vibe, nicht (Motor, PS, Antrieb); kein Teilekatalog.`,
    );
  }

  return lines.join("\n");
}

async function loadVehicleForOwner(
  vehicleId: string,
  ownerUserId: string,
): Promise<Vehicle | null> {
  const supabase = await createClient();
  const primary = await loadVehicleProjectionMaybeSingle(
    supabase.from("vehicles"),
    { column: "id", value: vehicleId },
    { column: "user_id", value: ownerUserId },
  );

  if (primary.data) return primary.data;

  if (!isSupabaseAdminConfigured()) return null;

  const admin = createAdminClient();
  const fallback = await loadVehicleProjectionMaybeSingle(
    admin.from("vehicles"),
    { column: "id", value: vehicleId },
    { column: "user_id", value: ownerUserId },
  );
  return fallback.data;
}

export async function loadVehicleRoastContext(
  vehicleId: string,
  ownerUserId: string,
): Promise<VehicleRoastContext | null> {
  const vehicle = await loadVehicleForOwner(vehicleId, ownerUserId);
  if (!vehicle) return null;

  const profile = buildBuildDnaProfileContext(vehicle);
  const documents = await loadOwnerVehicleDocuments(vehicleId, ownerUserId);
  const rawMods = extractVehicleModifications(documents, {
    hideFinancials: true,
    includeOptedInInvoices: true,
    respectLineItemShowcase: false,
  });

  const seen = new Set<string>();
  const modifications: RoastModificationLine[] = [];
  for (const mod of rawMods) {
    const key = `${mod.partName.toLowerCase()}|${mod.manufacturer ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    modifications.push(mapModificationLine(mod));
  }

  const vehicleLabel = `${vehicle.make} ${vehicle.model}`.trim();
  const isStock = modifications.length === 0;

  return {
    vehicleId,
    ownerUserId,
    vehicleLabel,
    year: profile.year,
    engine: profile.engine,
    powerPs: profile.powerPs,
    fuelType: profile.fuelType,
    transmission: profile.transmission,
    drivetrain: profile.drivetrain,
    modifications,
    isStock,
    llmContext: formatLlmContext({
      vehicleLabel,
      year: profile.year,
      engine: profile.engine,
      powerPs: profile.powerPs,
      fuelType: profile.fuelType,
      transmission: profile.transmission,
      drivetrain: profile.drivetrain,
      modifications,
      isStock,
    }),
  };
}
