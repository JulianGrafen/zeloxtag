import type { SpendBucket } from "@/lib/documents/cost-overview";
import {
  assessPowerGoal,
  type PowerGoalAssessment,
} from "@/lib/build-planner/build-planner-power-goal";
import type { BuildDnaProfileContext } from "@/lib/showcase/build-dna-profile-context";

export type BuildIntentKind =
  | "power"
  | "track"
  | "handling"
  | "show"
  | "generic";

export type BuildIntentAssessment = {
  kind: BuildIntentKind;
  powerGoal: PowerGoalAssessment | null;
  contextLines: string[];
  titleLabel: string;
  category: SpendBucket | null;
  estimatedPriceEur: number | null;
  todos: string[];
};

const TRACK_PATTERN =
  /\b(track\s*tool|tracktool|tracktol|trackttol|trackday|track-day|rennstrecke|rennbahn|time\s*attack|tourenwagen|ringtool|nordschleife|hockenheim)\b/i;

const TRACK_LOOSE_PATTERN =
  /ultimat\w*\s+track|track\w*\s+aus\s+dem|vom\s+touring.*track|track.*touring/i;

const HANDLING_PATTERN =
  /\b(fahrwerk|handling|kurven|straßenlage|coilover|gewindefahrwerk|stabilisator|achsvermessung)\b/i;

const SHOW_PATTERN =
  /\b(showcar|show\s*car|optik|widebody|luftfahrwerk|felgen)\b/i;

function isDieselProfile(profile: BuildDnaProfileContext): boolean {
  if (profile.fuelType?.toLowerCase().includes("diesel")) return true;
  return /\d{3}d\b/i.test(`${profile.make} ${profile.model}`);
}

function isTouringBody(profile: BuildDnaProfileContext, userText: string): boolean {
  const hay = `${profile.model} ${userText}`.toLowerCase();
  return /\btouring\b|kombi|estate|avant|variant/i.test(hay);
}

function trackBuildTodos(
  profile: BuildDnaProfileContext,
  userText: string,
): string[] {
  const touring = isTouringBody(profile, userText);
  const diesel = isDieselProfile(profile);

  const base = [
    "Sportfahrwerk (Gewinde/Coilover) + verstärkte Stabilisatoren für Track-Setup",
    "Bremsen-Paket (große Scheiben/Beläge, Hochtemperatur-Flüssigkeit, Belüftung)",
    "Schalensitze, Gurte und feste Sitzposition (Halterung prüfen)",
    touring
      ? "Touring-Versteifung (Domstreben, Unterboden-/Heck-Versteifung, ggf. Halbkäfig)"
      : "Versteifung (Domstreben, ggf. Halbkäfig / Schraub-Innenausbau)",
    "Leichtbau-Räder + Track-Reifen (separates Rad/Reifen-Set)",
    "Achsvermessung, Corner-Weight / Geo für vorne-lastiges Track-Setup",
    "Öl- und Getriebe-Kühlung für längere Sessions",
  ];

  if (diesel) {
    base.push(
      "Diesel-Track-Basis: Ladeluft-/Ölkühlung und abgestimmte Kennfelder (Traktion vor Peak-PS)",
      "Differenzial / Lager (z. B. LSD oder verstärkte Antriebslager) für Lastwechsel",
    );
  } else {
    base.push(
      "Motor-Basis für Track: Kühlung, Zündung/Kraftstoff, zuverlässige Ölversorgung",
    );
  }

  base.push(
    "Aero light (Splitter/Wing nur wenn Setup & Balance es tragen)",
    "Setup-Protokoll: Reifendruck, Bremsentemp, Warm-up-Runden",
  );

  return base;
}

function handlingTodos(): string[] {
  return [
    "Gewindefahrwerk / optimierte Dämpfer abgestimmt auf Straße + schnelle Runde",
    "Unterboden- und Domstreben für präziseres Lenkverhalten",
    "Sport-Bremsen und frische Hochleistungs-Bremsflüssigkeit",
    "Sportreifen oder Semi-Slick auf leichten Felgen",
    "Achsvermessung und Einstellarbeit (Sturz/Spur/Caster)",
    "Probefahrt und Feinjustierung",
  ];
}

function showTodos(): string[] {
  return [
    "Design-Linie und Teileliste (Felgen, Spoiler, Diffusor, Details)",
    "Karosserie-/Aero-Teile passend zum Fahrzeug beschaffen",
    "Montage, Spaltmaße und Lack/Versiegelung",
    "Fahrwerk-Tieferlegung oder Luftfahrwerk einstellen",
    "Finishing (Beleuchtung, Badges, Innenraum-Details)",
  ];
}

function detectNonPowerKind(userText: string): BuildIntentKind | null {
  if (TRACK_PATTERN.test(userText) || TRACK_LOOSE_PATTERN.test(userText)) {
    return "track";
  }
  if (SHOW_PATTERN.test(userText)) return "show";
  if (HANDLING_PATTERN.test(userText)) return "handling";
  return null;
}

export function assessBuildIntent(input: {
  userText: string;
  profile: BuildDnaProfileContext;
}): BuildIntentAssessment {
  const userText = input.userText.trim();
  const profile = input.profile;

  const powerGoal = assessPowerGoal({ userText, profile });
  if (powerGoal) {
    return {
      kind: "power",
      powerGoal,
      contextLines: [
        "Build-Ziel: Leistungssteigerung",
        ...powerGoal.contextLines,
      ],
      titleLabel: `Performance (ca. ${powerGoal.targetPs} PS)`,
      category: "engine_exhaust",
      estimatedPriceEur: powerGoal.estimatedPriceEur,
      todos: [],
    };
  }

  const performanceKeywords =
    /\b(ps|leistung|power|stage|turbo|chiptuning|kennfeld)\b/i.test(userText);

  const kind = detectNonPowerKind(userText) ?? (performanceKeywords ? "power" : "generic");

  if (kind === "track") {
    return {
      kind: "track",
      powerGoal: null,
      contextLines: [
        "Build-Ziel: Tracktool / Rennsport-Setup (kein generisches Projektmanagement).",
        isTouringBody(profile, userText)
          ? "Touring-Basis: Gewicht, Versteifung, Bremsen und Kühlung sind Priorität vor Peak-Leistung."
          : "Fokus: Fahrwerk, Bremsen, Sicherheit im Innenraum, Kühlung, Setup.",
      ],
      titleLabel: "Tracktool-Build",
      category: "chassis",
      estimatedPriceEur: isTouringBody(profile, userText) ? 22_000 : 18_000,
      todos: trackBuildTodos(profile, userText),
    };
  }

  if (kind === "handling") {
    return {
      kind: "handling",
      powerGoal: null,
      contextLines: [
        "Build-Ziel: Handling / Fahrwerk — konkrete Teile und Einstell-Schritte.",
      ],
      titleLabel: "Handling-Upgrade",
      category: "chassis",
      estimatedPriceEur: 6_500,
      todos: handlingTodos(),
    };
  }

  if (kind === "show") {
    return {
      kind: "show",
      powerGoal: null,
      contextLines: ["Build-Ziel: Optik / Show — konkrete Umbau-Schritte."],
      titleLabel: "Show-Build",
      category: "body_aero",
      estimatedPriceEur: 8_000,
      todos: showTodos(),
    };
  }

  return {
    kind: "generic",
    powerGoal: null,
    contextLines: [
      "Build-Ziel: Freitext — spezifische Teile und Montage-Schritte ableiten, keine generischen Projektphasen.",
    ],
    titleLabel: "Build-Projekt",
    category: null,
    estimatedPriceEur: null,
    todos: [],
  };
}

export function formatBuildIntentContextBlock(
  assessment: BuildIntentAssessment,
): string {
  return ["Build-Intent (Chef-Ingenieur):", ...assessment.contextLines].join(
    "\n",
  );
}
