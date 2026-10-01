/** Build frustration captured at claim / digital onboarding. */

export const BUILD_PAIN_POINT_STORAGE_KEY = "zt_build_pain_point_v1";

export const BUILD_PAIN_POINT_EMPATHY_LINE =
  "Kennen wir zu gut. Genau dafür haben wir ZeloxTag gebaut – wir räumen das jetzt auf.";

export type ZeloxBuildPainPoint = "costs" | "documents" | "showcase";

export type BuildPainPointOption = {
  id: ZeloxBuildPainPoint;
  label: string;
};

export const BUILD_PAIN_POINT_OPTIONS: readonly BuildPainPointOption[] = [
  {
    id: "costs",
    label:
      "Ich habe ehrlich gesagt keine Ahnung, wie viel Geld wirklich schon im Auto steckt.",
  },
  {
    id: "documents",
    label:
      "Meine Rechnungen und ABEs fliegen irgendwo im Handschuhfach oder Mail-Postfach herum.",
  },
  {
    id: "showcase",
    label: "Auf Treffen will ich mehr über mein Fahrzeug zeigen können.",
  },
] as const;

export function isZeloxBuildPainPoint(value: string): value is ZeloxBuildPainPoint {
  return value === "costs" || value === "documents" || value === "showcase";
}

export function readBuildPainPoint(): ZeloxBuildPainPoint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BUILD_PAIN_POINT_STORAGE_KEY);
    if (!raw || !isZeloxBuildPainPoint(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function writeBuildPainPoint(pain: ZeloxBuildPainPoint): void {
  try {
    window.localStorage.setItem(BUILD_PAIN_POINT_STORAGE_KEY, pain);
  } catch {
    /* quota / private mode */
  }
}
