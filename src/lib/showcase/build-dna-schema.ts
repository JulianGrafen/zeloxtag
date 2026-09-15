import { z } from "zod";

export const BUILD_DNA_ARCHETYPES = [
  "Track Weapon",
  "Street Sleeper",
  "Show Car",
  "Canyon Carver",
  "OEM+",
] as const;

export type BuildDnaArchetype = (typeof BUILD_DNA_ARCHETYPES)[number];

export const BUILD_DNA_RADAR_CATEGORIES = [
  "Power",
  "Handling",
  "Style",
  "Reliability",
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

export function parseShowcaseBuildDna(
  raw: unknown,
): ShowcaseBuildDna | null {
  const parsed = showcaseBuildDnaSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Normalize radar order for UI (Power → Reliability). */
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
