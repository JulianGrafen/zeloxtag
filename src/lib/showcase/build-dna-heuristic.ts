import type { PublicModification } from "@/lib/vehicles/public-showcase-data";

import {
  BUILD_DNA_RADAR_CATEGORIES,
  type BuildDnaArchetype,
  type ShowcaseBuildDna,
} from "./build-dna-schema";

type ScoreBucket = {
  power: number;
  handling: number;
  style: number;
  reliability: number;
};

const KEYWORDS: Record<keyof ScoreBucket, RegExp[]> = {
  power: [
    /\bturbo\b/i,
    /\bkompressor\b/i,
    /supercharger/i,
    /\becu\b/i,
    /tune/i,
    /downpipe/i,
    /abgasanlage/i,
    /exhaust/i,
    /nocken/i,
    /cam/i,
    /injector/i,
    /einspritz/i,
    /lpg/i,
    /methanol/i,
    /nitro/i,
    /\bpsi\b/i,
    /stage\s*[123]/i,
  ],
  handling: [
    /coilover/i,
    /fahrwerk/i,
    /gewinde/i,
    /stabi/i,
    /camber/i,
    /spur/i,
    /bremse/i,
    /brems/i,
    /reifen/i,
    /semi\s*slick/i,
    /slick/i,
    /chassis/i,
    /härte/i,
    /sturz/i,
    /wishbone/i,
    /lenker/i,
  ],
  style: [
    /felge/i,
    /wheel/i,
    /spoiler/i,
    /diffusor/i,
    /splitter/i,
    /lippe/i,
    /widebody/i,
    /wrap/i,
    /folie/i,
    /lack/i,
    /interior/i,
    /led/i,
    /carbon/i,
    /aero/i,
    /bodykit/i,
  ],
  reliability: [
    /intercooler/i,
    /kühler/i,
    /cooler/i,
    /ölkühler/i,
    /catch\s*can/i,
    /ölfang/i,
    /forged/i,
    /pleuel/i,
    /getriebe/i,
    /kupplung/i,
    /clutch/i,
    /lager/i,
    /ölwechsel/i,
    /service/i,
    /inspektion/i,
  ],
};

function clampScore(value: number): number {
  return Math.min(100, Math.max(1, Math.round(value)));
}

function scoreText(text: string, patterns: RegExp[]): number {
  let hits = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) hits += 1;
  }
  return hits;
}

function aggregateScores(mods: readonly PublicModification[]): ScoreBucket {
  let power = 28;
  let handling = 28;
  let style = 28;
  let reliability = 32;

  for (const mod of mods) {
    const blob = `${mod.label} ${mod.category} ${mod.vendor ?? ""}`;
    power += scoreText(blob, KEYWORDS.power) * 9;
    handling += scoreText(blob, KEYWORDS.handling) * 9;
    style += scoreText(blob, KEYWORDS.style) * 8;
    reliability += scoreText(blob, KEYWORDS.reliability) * 7;
  }

  const countBoost = Math.min(12, mods.length * 2);
  power += countBoost;
  handling += countBoost;
  style += countBoost;
  reliability += countBoost;

  return {
    power: clampScore(power),
    handling: clampScore(handling),
    style: clampScore(style),
    reliability: clampScore(reliability),
  };
}

function pickArchetype(scores: ScoreBucket): BuildDnaArchetype {
  const { power, handling, style, reliability } = scores;

  if (handling >= 70 && power >= 70) return "Streckenwaffe";
  if (power >= 65 && style <= 45) return "Heimlicher Renner";
  if (style >= 70 && power < 60) return "Showcar";
  if (handling >= 65 && power >= 45 && power < 70) return "Kurvenjäger";
  if (reliability >= 60 && style >= 45 && style <= 65) return "OEM+";

  const ranked = [
    { key: "power" as const, value: power },
    { key: "handling" as const, value: handling },
    { key: "style" as const, value: style },
    { key: "reliability" as const, value: reliability },
  ].sort((a, b) => b.value - a.value);

  const top = ranked[0]?.key;
  if (top === "style") return "Showcar";
  if (top === "handling") return "Kurvenjäger";
  if (top === "reliability") return "OEM+";
  return "Heimlicher Renner";
}

function punchlineFor(archetype: BuildDnaArchetype): string {
  switch (archetype) {
    case "Streckenwaffe":
      return "Gebaut für die Rennstrecke — Form folgt der Funktion.";
    case "Heimlicher Renner":
      return "Sieht harmlos aus, zieht wie ein Güterzug.";
    case "Showcar":
      return "Showstopper mit Liebe zum Detail.";
    case "Kurvenjäger":
      return "Kurven sind die Heimat — präzise, schnell, kontrolliert.";
    case "OEM+":
      return "Dezent verbessert, solide dokumentiert — OEM+ mit Charakter.";
  }
}

export function computeBuildDnaHeuristic(
  modifications: readonly PublicModification[],
): ShowcaseBuildDna {
  const scores = aggregateScores(modifications);
  const archetype = pickArchetype(scores);

  const radar = (
    [
      ["Leistung", "power"],
      ["Fahrwerk", "handling"],
      ["Optik", "style"],
      ["Haltbarkeit", "reliability"],
    ] as const
  ).map(([category, key]) => ({
    category,
    score: scores[key],
  }));

  return {
    archetype,
    radar,
    punchline: punchlineFor(archetype),
  };
}
