/** Canonical German showcase archetypes (stored in JSON + UI headline). */
export const BUILD_DNA_ARCHETYPE_LABELS = [
  "Streckenwaffe",
  "Heimlicher Renner",
  "Showcar",
  "Kurvenjäger",
  "OEM+",
] as const;

export type BuildDnaArchetypeLabel =
  (typeof BUILD_DNA_ARCHETYPE_LABELS)[number];

export const BUILD_DNA_RADAR_LABELS = [
  "Leistung",
  "Fahrwerk",
  "Optik",
  "Haltbarkeit",
] as const;

export type BuildDnaRadarLabel = (typeof BUILD_DNA_RADAR_LABELS)[number];

/** English LLM / legacy cache values → current German labels. */
export const LEGACY_BUILD_DNA_ARCHETYPE: Record<string, BuildDnaArchetypeLabel> = {
  "Track Weapon": "Streckenwaffe",
  "Street Sleeper": "Heimlicher Renner",
  "Show Car": "Showcar",
  "Canyon Carver": "Kurvenjäger",
  "OEM+": "OEM+",
};

/** Legacy radar axis names from early Build DNA payloads. */
export const LEGACY_BUILD_DNA_RADAR: Record<string, BuildDnaRadarLabel> = {
  Power: "Leistung",
  Handling: "Fahrwerk",
  Style: "Optik",
  Reliability: "Haltbarkeit",
};
