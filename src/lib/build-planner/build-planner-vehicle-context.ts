import "server-only";

import {
  buildBuildDnaProfileContext,
  type BuildDnaProfileContext,
} from "@/lib/showcase/build-dna-profile-context";
import {
  parseShowcaseBuildDna,
  type ShowcaseBuildDna,
} from "@/lib/showcase/build-dna-schema";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { loadVehicleProjectionMaybeSingle } from "@/lib/vehicles/load-vehicle-projection";
import type { Vehicle } from "@/types/database";

import { loadBuildPlannerExistingModBullets } from "@/lib/build-planner/build-planner-existing-mods";
import {
  assessBuildIntent,
  formatBuildIntentContextBlock,
} from "@/lib/build-planner/build-planner-build-intent";
import { listPlannedModsWithTodosForVehicle } from "@/lib/build-planner/planned-mods-repository";

export type BuildPlannerVehicleContextInput = {
  profile: BuildDnaProfileContext;
  buildDna?: ShowcaseBuildDna | null;
  plannedModTitles?: string[];
  existingModBullets?: string[];
  buildIntentContext?: string | null;
};

export type BuildPlannerVehicleContextBundle = {
  profile: BuildDnaProfileContext | null;
  promptText: string;
};

/** Plain-text block for LLM prompts (no PII beyond owner-entered vehicle data). */
export function formatBuildPlannerVehicleContext(
  input: BuildPlannerVehicleContextInput,
): string {
  const lines: string[] = [
    "Fahrzeug- & Build-Profil (Halter-Daten, für Einordnung nutzen):",
  ];

  const yearSuffix = input.profile.year ? ` (${input.profile.year})` : "";
  lines.push(
    `Fahrzeug: ${input.profile.make} ${input.profile.model}${yearSuffix}`,
  );

  if (input.profile.engine) {
    lines.push(`Motor: ${input.profile.engine}`);
  }
  if (input.profile.powerPs != null) {
    lines.push(`Ist-Leistung: ${input.profile.powerPs} PS`);
  }
  if (input.profile.specificationsText) {
    lines.push(input.profile.specificationsText);
  }

  if (input.buildIntentContext?.trim()) {
    lines.push("", input.buildIntentContext.trim());
  }

  const existingMods = (input.existingModBullets ?? []).filter(
    (line) => line.trim().length > 0,
  );
  if (existingMods.length > 0) {
    lines.push("", "Bisherige Umbauten (Garage / Belege):");
    lines.push(...existingMods);
  }

  if (input.buildDna) {
    lines.push(
      `Build-DNA: ${input.buildDna.archetype} — „${input.buildDna.punchline}"`,
    );
  }

  const planned = (input.plannedModTitles ?? [])
    .map((title) => title.trim())
    .filter((title) => title.length > 0);
  if (planned.length > 0) {
    lines.push(`Bereits im Build-Plan: ${planned.join("; ")}`);
  }

  lines.push(
    "Bei Zielvorgaben (z. B. PS-Zahl): automatisch typisches Setup für diesen Motor ableiten — keine Rückfragen.",
  );

  return lines.join("\n");
}

async function bundleFromVehicle(
  vehicleId: string,
  vehicle: Pick<
    Vehicle,
    "make" | "model" | "year" | "tech_specs" | "showcase_build_dna"
  >,
  plannedModTitles: string[],
  ownerUserId: string,
  userGoalText?: string | null,
): Promise<BuildPlannerVehicleContextBundle> {
  const profile = buildBuildDnaProfileContext(vehicle);
  const buildDna = parseShowcaseBuildDna(vehicle.showcase_build_dna);
  const existingModBullets = await loadBuildPlannerExistingModBullets(
    vehicleId,
    ownerUserId,
  );

  const buildIntent =
    userGoalText?.trim()
      ? assessBuildIntent({ userText: userGoalText, profile })
      : null;

  return {
    profile,
    promptText: formatBuildPlannerVehicleContext({
      profile,
      buildDna,
      plannedModTitles,
      existingModBullets,
      buildIntentContext: buildIntent
        ? formatBuildIntentContextBlock(buildIntent)
        : null,
    }),
  };
}

async function loadVehicleRowForOwner(
  vehicleId: string,
  ownerUserId: string,
): Promise<Pick<
  Vehicle,
  "make" | "model" | "year" | "tech_specs" | "showcase_build_dna"
> | null> {
  const supabase = await createClient();
  const primary = await loadVehicleProjectionMaybeSingle(
    supabase.from("vehicles"),
    { column: "id", value: vehicleId },
    { column: "user_id", value: ownerUserId },
  );

  if (primary.data) {
    return primary.data;
  }

  if (primary.error) {
    console.error("[build-planner] vehicle context load failed", primary.error);
  }

  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const admin = createAdminClient();
  const fallback = await loadVehicleProjectionMaybeSingle(
    admin.from("vehicles"),
    { column: "id", value: vehicleId },
    { column: "user_id", value: ownerUserId },
  );

  if (fallback.error) {
    console.error(
      "[build-planner] vehicle context admin load failed",
      fallback.error,
    );
  }

  return fallback.data;
}

export async function loadBuildPlannerVehicleContextBundle(
  vehicleId: string,
  ownerUserId: string,
  userGoalText?: string | null,
): Promise<BuildPlannerVehicleContextBundle> {
  const vehicle = await loadVehicleRowForOwner(vehicleId, ownerUserId);

  const mods = await listPlannedModsWithTodosForVehicle(vehicleId);
  const plannedModTitles = mods
    .filter((mod) => mod.status === "draft" || mod.status === "active")
    .map((mod) => mod.title);

  if (!vehicle) {
    return {
      profile: null,
      promptText:
        "Fahrzeug- & Build-Profil: (keine gespeicherten Technik-Daten geladen — nutze nur die Nutzeranfrage).",
    };
  }

  return bundleFromVehicle(
    vehicleId,
    vehicle,
    plannedModTitles,
    ownerUserId,
    userGoalText,
  );
}

export async function loadBuildPlannerVehicleContext(
  vehicleId: string,
  ownerUserId?: string,
): Promise<string> {
  if (!ownerUserId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicles")
      .select("make, model, year, tech_specs, showcase_build_dna")
      .eq("id", vehicleId)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.error("[build-planner] vehicle context load failed", error);
      }
      return "";
    }

    const mods = await listPlannedModsWithTodosForVehicle(vehicleId);
    const plannedModTitles = mods
      .filter((mod) => mod.status === "draft" || mod.status === "active")
      .map((mod) => mod.title);

    const vehicle = data as Pick<
      Vehicle,
      "make" | "model" | "year" | "tech_specs" | "showcase_build_dna"
    >;
    const bundle = await bundleFromVehicle(
      vehicleId,
      vehicle,
      plannedModTitles,
      ownerUserId ?? "",
      undefined,
    );
    return bundle.promptText;
  }

  const bundle = await loadBuildPlannerVehicleContextBundle(
    vehicleId,
    ownerUserId,
  );
  return bundle.promptText;
}
