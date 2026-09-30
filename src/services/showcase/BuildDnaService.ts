import "server-only";

import { BUILD_DNA_SYSTEM_PROMPT } from "@/lib/showcase/build-dna-prompt";
import {
  parseShowcaseBuildDna,
  type ShowcaseBuildDna,
} from "@/lib/showcase/build-dna-schema";
import { computeBuildDnaHeuristic } from "@/lib/showcase/build-dna-heuristic";
import { getOcrLlmClient, isLlmConfigured } from "@/lib/ocr/llm-client";
import type { BuildDnaProfileContext } from "@/lib/showcase/build-dna-profile-context";
import type { PublicModification } from "@/lib/vehicles/public-showcase-data";

export type BuildDnaVehicleContext = BuildDnaProfileContext;

function buildUserPayload(
  modifications: readonly PublicModification[],
  context?: BuildDnaProfileContext,
): string {
  const mods = modifications.map((mod) => ({
    label: mod.label,
    category: mod.category,
    vendor: mod.vendor,
    source: mod.source,
  }));

  return JSON.stringify(
    {
      vehicle: context
        ? {
            make: context.make,
            model: context.model,
            year: context.year,
            engine: context.engine,
            powerPs: context.powerPs,
            powerKw: context.powerKw,
            torqueNm: context.torqueNm,
            fuelType: context.fuelType,
            transmission: context.transmission,
            drivetrain: context.drivetrain,
            notes: context.notes,
            specificationsText: context.specificationsText,
            buildPersonalityLabels: context.buildPersonalityLabels,
          }
        : null,
      modifications: mods,
    },
    null,
    2,
  );
}

export async function generateShowcaseBuildDna(
  modifications: readonly PublicModification[],
  context?: BuildDnaProfileContext,
): Promise<ShowcaseBuildDna> {
  if (modifications.length < 2) {
    return computeBuildDnaHeuristic(modifications, context);
  }

  if (!isLlmConfigured()) {
    return computeBuildDnaHeuristic(modifications, context);
  }

  try {
    const { client, model } = getOcrLlmClient();
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: BUILD_DNA_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPayload(modifications, context),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      return computeBuildDnaHeuristic(modifications, context);
    }

    const parsed = parseShowcaseBuildDna(JSON.parse(raw));
    if (parsed) return parsed;
  } catch (error) {
    console.warn("[BuildDnaService] LLM failed, using heuristic", error);
  }

  return computeBuildDnaHeuristic(modifications, context);
}
