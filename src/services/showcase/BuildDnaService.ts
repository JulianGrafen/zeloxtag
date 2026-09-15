import "server-only";

import { BUILD_DNA_SYSTEM_PROMPT } from "@/lib/showcase/build-dna-prompt";
import {
  parseShowcaseBuildDna,
  type ShowcaseBuildDna,
} from "@/lib/showcase/build-dna-schema";
import { computeBuildDnaHeuristic } from "@/lib/showcase/build-dna-heuristic";
import { getOcrLlmClient, isLlmConfigured } from "@/lib/ocr/llm-client";
import type { PublicModification } from "@/lib/vehicles/public-showcase-data";

export type BuildDnaVehicleContext = {
  make: string;
  model: string;
  year: number | null;
  powerPs: number | null;
  notes: string | null;
};

function buildUserPayload(
  modifications: readonly PublicModification[],
  context?: BuildDnaVehicleContext,
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
            powerPs: context.powerPs,
            notes: context.notes,
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
  context?: BuildDnaVehicleContext,
): Promise<ShowcaseBuildDna> {
  if (modifications.length < 2) {
    return computeBuildDnaHeuristic(modifications);
  }

  if (!isLlmConfigured()) {
    return computeBuildDnaHeuristic(modifications);
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
      return computeBuildDnaHeuristic(modifications);
    }

    const parsed = parseShowcaseBuildDna(JSON.parse(raw));
    if (parsed) return parsed;
  } catch (error) {
    console.warn("[BuildDnaService] LLM failed, using heuristic", error);
  }

  return computeBuildDnaHeuristic(modifications);
}
