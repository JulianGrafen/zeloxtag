import "server-only";

import {
  extractVehicleModifications,
  type VehicleModification,
} from "@/lib/vehicles/vehicle-modifications";
import { loadOwnerVehicleDocuments } from "@/lib/vehicles/load-owner-vehicle-documents";

const MAX_MOD_BULLETS = 40;

function formatModificationBullet(mod: VehicleModification): string {
  const label = mod.partName.trim();
  const extras: string[] = [];

  if (mod.manufacturer?.trim()) {
    extras.push(mod.manufacturer.trim());
  }
  if (mod.source === "abe" && mod.kbaNumber?.trim()) {
    extras.push(`KBA ${mod.kbaNumber.trim()}`);
  } else if (mod.category.trim() && mod.category.trim() !== label) {
    extras.push(mod.category.trim());
  }

  const suffix = extras.length > 0 ? ` (${extras.join(" · ")})` : "";
  return `• ${label}${suffix}`.slice(0, 240);
}

export function formatExistingModBullets(
  modifications: readonly VehicleModification[],
): string[] {
  const seen = new Set<string>();
  const bullets: string[] = [];

  for (const mod of modifications) {
    const key = `${mod.partName.trim().toLowerCase()}|${mod.manufacturer ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    bullets.push(formatModificationBullet(mod));
    if (bullets.length >= MAX_MOD_BULLETS) break;
  }

  return bullets;
}

export async function loadBuildPlannerExistingModBullets(
  vehicleId: string,
  ownerUserId: string,
): Promise<string[]> {
  const documents = await loadOwnerVehicleDocuments(vehicleId, ownerUserId);
  if (documents.length === 0) return [];

  const modifications = extractVehicleModifications(documents, {
    hideFinancials: true,
    includeOptedInInvoices: true,
    respectLineItemShowcase: false,
  });

  return formatExistingModBullets(modifications);
}
