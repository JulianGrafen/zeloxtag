import type { BuildDnaProfileContext } from "@/lib/showcase/build-dna-profile-context";

export type PowerGoalTier = "moderate" | "ambitious" | "extreme";

export type PowerGoalAssessment = {
  targetPs: number;
  baselinePs: number | null;
  tier: PowerGoalTier;
  /** Short block for LLM context (no legal/TÜV tone). */
  contextLines: string[];
  titleQualifier: string | null;
  estimatedPriceEur: number | null;
  extraTodos: string[];
};

export function extractTargetPsFromText(userText: string): number | null {
  const match = userText.match(/(\d{2,4})\s*ps\b/i);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) && value >= 50 && value <= 2000 ? value : null;
}

function isDieselProfile(profile: BuildDnaProfileContext): boolean {
  if (profile.fuelType?.toLowerCase().includes("diesel")) return true;
  return /\d{3}d\b/i.test(`${profile.make} ${profile.model}`);
}

function resolveBaselinePs(profile: BuildDnaProfileContext): number | null {
  if (profile.powerPs != null && profile.powerPs > 0) {
    return profile.powerPs;
  }
  return null;
}

function classifyTier(
  targetPs: number,
  baselinePs: number | null,
): PowerGoalTier {
  if (baselinePs == null) {
    if (targetPs >= 650) return "extreme";
    if (targetPs >= 450) return "ambitious";
    return "moderate";
  }

  const delta = targetPs - baselinePs;
  const ratio = targetPs / baselinePs;

  if (delta <= 80 || ratio <= 1.35) return "moderate";
  if (delta <= 220 || ratio <= 2.2) return "ambitious";
  return "extreme";
}

function estimatePerformanceBundlePrice(
  targetPs: number,
  baselinePs: number | null,
  isDiesel: boolean,
): number {
  const base = isDiesel ? 3_800 : 4_500;
  if (baselinePs == null) {
    if (targetPs >= 650) return 45_000;
    if (targetPs >= 450) return 18_000;
    return base;
  }

  const delta = Math.max(0, targetPs - baselinePs - 60);
  const scaled = base + Math.min(52_000, Math.round(delta * 110));
  return Math.min(99_999, scaled);
}

function tierExtraTodos(
  tier: PowerGoalTier,
  isDiesel: boolean,
): string[] {
  if (tier === "moderate") return [];

  const shared = [
    "Kühlkreislauf (Wasser/Öl/Ladeluft) für Dauerlast dimensionieren",
    "Bremsen und Reifen an die Ziel-Leistung anpassen",
  ];

  if (tier === "ambitious") {
    return [
      ...shared,
      isDiesel
        ? "Getriebe / Wandler für höheres Drehmoment absichern (z. B. xHP + Kühlung)"
        : "Kraftstoffsystem & Zündung für höhere Ladeziele erweitern",
    ];
  }

  return [
    "Motoreninterna & Lager für hohe Ladeziele planen (Kolben, Pleuel, ggf. Nockenwellen)",
    isDiesel
      ? "Großer Hybrid-/Compound-Lader und passende Einspritzung (z. B. CP3/Dual)"
      : "Kompressor/Lader-Konzept für hohe Ziel-PS (oft Wechsel auf stärkere Basis)",
    "Getriebe verstärken oder tauschen (z. B. ZF/DSG Build)",
    ...shared,
    "Fahrwerk und Achsantrieb (Lager, Antriebswellen) abstimmen",
  ];
}

export function assessPowerGoal(input: {
  userText: string;
  profile: BuildDnaProfileContext;
}): PowerGoalAssessment | null {
  const targetPs = extractTargetPsFromText(input.userText);
  if (targetPs == null) return null;

  const baselinePs = resolveBaselinePs(input.profile);
  const tier = classifyTier(targetPs, baselinePs);
  const isDiesel = isDieselProfile(input.profile);
  const vehicle = `${input.profile.make} ${input.profile.model}`.trim();

  const contextLines: string[] = [
    `Nutzer-Ziel: ca. ${targetPs} PS`,
  ];
  if (baselinePs != null) {
    contextLines.push(`Ist-Leistung (Profil): ${baselinePs} PS`);
  }

  let titleQualifier: string | null = null;

  if (tier === "moderate") {
    contextLines.push(
      "Einordnung: Ziel liegt im typischen OEM+-/Stage-Bereich — Standard-Hardware- & Software-Kette planen.",
    );
  } else if (tier === "ambitious") {
    titleQualifier = "High-End";
    contextLines.push(
      "Einordnung: ambitioniertes Ziel — erweitertes Lader-/Einspritz-/Kühl-Paket plus Getriebe-Absicherung einplanen.",
    );
  } else {
    titleQualifier = "Stretch / Max-Build";
    contextLines.push(
      "Einordnung: extremes Stretch-Ziel für diese Basis — als Vollprojekt mit Motorinterna, Laderkonzept, Getriebe, Kühlung, Bremsen und Fahrwerk planen; Preis deutlich über Stage-2/3-Niveau.",
    );
    if (baselinePs != null && targetPs > baselinePs + 250) {
      contextLines.push(
        `Hinweis für Planung: ${targetPs} PS auf ~${baselinePs} PS Basis erfordert nahezu immer Plattform-Wechsel oder Vollaufbau — trotzdem konkretes Teile-Setup vorschlagen, nicht absagen.`,
      );
    }
  }

  if (vehicle.length > 1) {
    contextLines.push(`Fahrzeugbezug: ${vehicle}`);
  }

  return {
    targetPs,
    baselinePs,
    tier,
    contextLines,
    titleQualifier,
    estimatedPriceEur: estimatePerformanceBundlePrice(
      targetPs,
      baselinePs,
      isDiesel,
    ),
    extraTodos: tierExtraTodos(tier, isDiesel),
  };
}

export function formatPowerGoalContextBlock(
  assessment: PowerGoalAssessment,
): string {
  return [
    "Leistungs-Ziel (Chef-Ingenieur):",
    ...assessment.contextLines,
  ].join("\n");
}
