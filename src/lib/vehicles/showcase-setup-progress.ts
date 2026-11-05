/** Minimum filled tech-spec fields before „Fahrzeugdaten“ counts as maintained. */
export const SHOWCASE_SETUP_MIN_SPEC_FIELDS = 3;

export type ShowcaseSetupStepId =
  | "photo"
  | "specs"
  | "modifications"
  | "gallery"
  | "dyno"
  | "sound"
  | "public";

export type ShowcaseSetupStep = {
  id: ShowcaseSetupStepId;
  label: string;
  /** Call-to-action shown when this is the next open step. */
  action: string;
  done: boolean;
};

export type ShowcaseSetupInput = {
  hasPhoto: boolean;
  filledSpecCount: number;
  modificationCount: number;
  galleryPhotoCount: number;
  hasDynoChart: boolean;
  hasSound: boolean;
  isPublic: boolean;
};

export type ShowcaseSetupProgress = {
  steps: ShowcaseSetupStep[];
  doneCount: number;
  totalCount: number;
  /** 0–100, rounded. */
  percent: number;
  nextStep: ShowcaseSetupStep | null;
};

/**
 * Ordered by impact on the public showcase: identity first, then content,
 * then optional media, publishing last.
 */
export function buildShowcaseSetupProgress(
  input: ShowcaseSetupInput,
): ShowcaseSetupProgress {
  const steps: ShowcaseSetupStep[] = [
    {
      id: "photo",
      label: "Fahrzeugbild",
      action: "Fahrzeugbild hochladen",
      done: input.hasPhoto,
    },
    {
      id: "specs",
      label: "Fahrzeugdaten",
      action: "Leistung & Technik eintragen",
      done: input.filledSpecCount >= SHOWCASE_SETUP_MIN_SPEC_FIELDS,
    },
    {
      id: "modifications",
      label: "Umbauten",
      action: "Ersten Umbau erfassen",
      done: input.modificationCount > 0,
    },
    {
      id: "gallery",
      label: "Galerie",
      action: "Fotos zur Galerie hinzufügen",
      done: input.galleryPhotoCount > 0,
    },
    {
      id: "dyno",
      label: "Leistungsdiagramm",
      action: "Leistungsdiagramm hochladen",
      done: input.hasDynoChart,
    },
    {
      id: "sound",
      label: "Soundcheck",
      action: "Motorsound aufnehmen",
      done: input.hasSound,
    },
    {
      id: "public",
      label: "Öffentlich",
      action: "Profil veröffentlichen",
      done: input.isPublic,
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;
  const totalCount = steps.length;

  return {
    steps,
    doneCount,
    totalCount,
    percent: Math.round((doneCount / totalCount) * 100),
    nextStep: steps.find((step) => !step.done) ?? null,
  };
}
