export const BUILD_PERSONALITY_CHIP_MAX = 5;

export const BUILD_PERSONALITY_CHIPS = [
  { id: "groschengrab", label: "Groschengrab" },
  { id: "schiff", label: "Schiff" },
  { id: "sleeper", label: "Sleeper" },
  { id: "oem_plus", label: "OEM+" },
  { id: "dieselrakete", label: "Dieselrakete" },
  { id: "frontkratzer", label: "Frontkratzer" },
  { id: "spritschleuder", label: "Spritschleuder" },
  { id: "kurvenraeuber", label: "Kurvenräuber" },
  { id: "showcar", label: "Showcar" },
  { id: "daily", label: "Daily" },
  { id: "klangbombe", label: "Klangbombe" },
  { id: "streckenwaffe", label: "Streckenwaffe" },
] as const;

export type BuildPersonalityChipId =
  (typeof BUILD_PERSONALITY_CHIPS)[number]["id"];

const CHIP_ID_SET = new Set<string>(
  BUILD_PERSONALITY_CHIPS.map((chip) => chip.id),
);

const LABEL_BY_ID = new Map<string, string>(
  BUILD_PERSONALITY_CHIPS.map((chip) => [chip.id, chip.label]),
);

export function isBuildPersonalityChipId(
  value: string,
): value is BuildPersonalityChipId {
  return CHIP_ID_SET.has(value);
}

/** Dedupe, whitelist, cap at BUILD_PERSONALITY_CHIP_MAX. */
export function parseBuildPersonalityTags(raw: unknown): BuildPersonalityChipId[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const result: BuildPersonalityChipId[] = [];

  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const id = entry.trim();
    if (!id || !isBuildPersonalityChipId(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    if (result.length >= BUILD_PERSONALITY_CHIP_MAX) break;
  }

  return result;
}

export function buildPersonalityLabels(
  ids: readonly BuildPersonalityChipId[],
): string[] {
  return ids
    .map((id) => LABEL_BY_ID.get(id))
    .filter((label): label is string => Boolean(label));
}

export function buildPersonalityLabelForId(id: string): string | null {
  return LABEL_BY_ID.get(id) ?? null;
}
