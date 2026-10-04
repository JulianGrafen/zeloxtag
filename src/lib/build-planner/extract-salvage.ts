import { assessBuildIntent } from "@/lib/build-planner/build-planner-build-intent";
import {
  assessPowerGoal,
} from "@/lib/build-planner/build-planner-power-goal";
import type { BuildDnaProfileContext } from "@/lib/showcase/build-dna-profile-context";

import type { PlannedModExtractResult } from "@/lib/build-planner/extract-schema";

function isDieselProfile(profile: BuildDnaProfileContext): boolean {
  if (profile.fuelType?.toLowerCase().includes("diesel")) return true;
  return /\d{3}d\b/i.test(`${profile.make} ${profile.model}`);
}

function performanceTodos(profile: BuildDnaProfileContext): string[] {
  if (isDieselProfile(profile)) {
    return [
      "Upgrade-Turbolader (Stage 2/3 Hybrid passend zum Motor)",
      "Upgrade-Ladeluftkühler (größerer LLK / OEM+)",
      "Abgasseite / Downpipe anpassen",
      "Getriebesoftware (z. B. xHP Stage 3)",
      "ECU-Kennfeldoptimierung auf dem Prüfstand",
    ];
  }

  return [
    "Ladeluftführung prüfen (Ansaugsystem / Lader / Kühlung)",
    "Auspuff / Downpipe nach Ziel-Leistung",
    "Kraftstoffversorgung & Zündung abstimmen",
    "Motorsteuergerät optimieren (Stage-Setup)",
    "Leistungsmessung und Feinabstimmung",
  ];
}

/** Deterministic fallback using saved vehicle profile when LLM JSON fails validation. */
export function salvagePlannedModExtractFromContext(input: {
  userText: string;
  profile: BuildDnaProfileContext;
}): PlannedModExtractResult {
  const userText = input.userText.trim();
  const profile = input.profile;
  const intent = assessBuildIntent({ userText, profile });
  const powerGoal = intent.powerGoal ?? assessPowerGoal({ userText, profile });
  const vehicleLabel = `${profile.make} ${profile.model}`.trim();
  const yearSuffix = profile.year ? ` (${profile.year})` : "";

  let title: string;
  if (powerGoal) {
    const qualifier = powerGoal.titleQualifier;
    const stageHint =
      powerGoal.tier === "extreme"
        ? "Max-Build / Stretch"
        : powerGoal.tier === "ambitious"
          ? "High-End Performance Upgrade"
          : profile.powerPs != null &&
              powerGoal.targetPs > profile.powerPs + 40
            ? "Stage 3 Performance Upgrade"
            : "Performance Upgrade";
    const prefix = qualifier ? `${qualifier} ` : "";
    title = `${prefix}${stageHint} (ca. ${powerGoal.targetPs} PS)`;
  } else if (intent.kind === "track" || intent.kind === "handling" || intent.kind === "show") {
    title = intent.titleLabel;
  } else {
    title = userText.slice(0, 100);
  }

  if (vehicleLabel.length > 1) {
    title = `${vehicleLabel}${yearSuffix}: ${title}`;
  }

  let todoTitles: string[] = [];
  if (intent.kind === "power") {
    todoTitles = [
      ...performanceTodos(profile),
      ...(powerGoal?.extraTodos ?? []),
    ];
  } else if (intent.todos.length > 0) {
    todoTitles = intent.todos;
  } else {
    todoTitles = [
      "Konkrete Teileliste zum Zieltext ableiten (keine leeren Projektphasen)",
      "Beschaffung und Vorbereitung der Bauteile",
      "Einbau und Funktionsprüfung",
      "Feinabstimmung und Dokumentation im Build-Plan",
    ];
  }

  const estimatedPrice =
    intent.estimatedPriceEur ??
    powerGoal?.estimatedPriceEur ??
    (powerGoal ? (isDieselProfile(profile) ? 3800 : 4500) : null);

  return {
    part: {
      title: title.slice(0, 160),
      manufacturer: null,
      category: intent.category,
      plannedPriceEur: estimatedPrice,
      productUrl: null,
    },
    todos: todoTitles.slice(0, 14).map((step, index) => ({
      title: step,
      sortOrder: index,
    })),
    confidence: "low",
    warnings: [],
  };
}
