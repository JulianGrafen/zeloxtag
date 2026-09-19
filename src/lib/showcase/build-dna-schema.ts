import { z } from "zod";

import {
  BUILD_DNA_ARCHETYPE_LABELS,
  LEGACY_BUILD_DNA_ARCHETYPE,
  LEGACY_BUILD_DNA_RADAR,
} from "./build-dna-labels";

export const BUILD_DNA_ARCHETYPES = BUILD_DNA_ARCHETYPE_LABELS;

export type BuildDnaArchetype = (typeof BUILD_DNA_ARCHETYPES)[number];

export const BUILD_DNA_RADAR_CATEGORIES = [
  "Leistung",
  "Fahrwerk",
  "Optik",
  "Haltbarkeit",
] as const;

export type BuildDnaRadarCategory = (typeof BUILD_DNA_RADAR_CATEGORIES)[number];

const radarEntrySchema = z.object({
  category: z.enum(BUILD_DNA_RADAR_CATEGORIES),
  score: z.number().int().min(1).max(100),
});

export const showcaseBuildDnaSchema = z
  .object({
    archetype: z.enum(BUILD_DNA_ARCHETYPES),
    radar: z.array(radarEntrySchema).length(4),
    punchline: z.string().trim().min(1).max(160),
  })
  .superRefine((value, ctx) => {
    const categories = value.radar.map((row) => row.category);
    const expected = [...BUILD_DNA_RADAR_CATEGORIES];
    for (const cat of expected) {
      if (!categories.includes(cat)) {
        ctx.addIssue({
          code: "custom",
          message: `Missing radar category: ${cat}`,
          path: ["radar"],
        });
      }
    }
  });

export type ShowcaseBuildDna = z.infer<typeof showcaseBuildDnaSchema>;

function normalizeShowcaseBuildDnaRaw(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const record = raw as Record<string, unknown>;
  const archetypeRaw =
    typeof record.archetype === "string" ? record.archetype.trim() : "";
  const archetype = LEGACY_BUILD_DNA_ARCHETYPE[archetypeRaw] ?? archetypeRaw;

  const radar = Array.isArray(record.radar)
    ? record.radar.map((entry) => {
        if (!entry || typeof entry !== "object") return entry;
        const row = entry as Record<string, unknown>;
        const categoryRaw =
          typeof row.category === "string" ? row.category.trim() : "";
        const category = LEGACY_BUILD_DNA_RADAR[categoryRaw] ?? categoryRaw;
        return { ...row, category };
      })
    : record.radar;

  return { ...record, archetype, radar };
}

export function parseShowcaseBuildDna(
  raw: unknown,
): ShowcaseBuildDna | null {
  const parsed = showcaseBuildDnaSchema.safeParse(
    normalizeShowcaseBuildDnaRaw(raw),
  );
  return parsed.success ? parsed.data : null;
}

/** Normalize radar order for UI (Leistung → Haltbarkeit). */
export function orderedRadarScores(
  dna: ShowcaseBuildDna,
): { category: BuildDnaRadarCategory; score: number }[] {
  const byCategory = new Map(
    dna.radar.map((row) => [row.category, row.score]),
  );
  return BUILD_DNA_RADAR_CATEGORIES.map((category) => ({
    category,
    score: byCategory.get(category) ?? 50,
  }));
}
