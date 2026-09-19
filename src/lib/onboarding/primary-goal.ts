/** Why the user chose ZeloxTag — set once at first dashboard onboarding. */

export const PRIMARY_GOAL_STORAGE_KEY = "zt_primary_goal_v1";

export type ZeloxPrimaryGoal = "werterhalt" | "showcase" | "documents";

export type PrimaryGoalOption = {
  id: ZeloxPrimaryGoal;
  title: string;
  description: string;
};

export const PRIMARY_GOAL_OPTIONS: readonly PrimaryGoalOption[] = [
  {
    id: "werterhalt",
    title: "Werterhalt",
    description: "Beim Verkauf jeden Cent des Builds nachweisen.",
  },
  {
    id: "showcase",
    title: "Visitenkarte fürs Tuningtreffen",
    description: "Mod-Liste & Docs per QR am Auto zeigen.",
  },
  {
    id: "documents",
    title: "Dokumente verwalten",
    description: "ABEs, Rechnungen und TÜV an einem Ort.",
  },
] as const;

export function isZeloxPrimaryGoal(value: string): value is ZeloxPrimaryGoal {
  return value === "werterhalt" || value === "showcase" || value === "documents";
}

export function readPrimaryGoal(): ZeloxPrimaryGoal | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PRIMARY_GOAL_STORAGE_KEY);
    if (!raw || !isZeloxPrimaryGoal(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function writePrimaryGoal(goal: ZeloxPrimaryGoal): void {
  try {
    window.localStorage.setItem(PRIMARY_GOAL_STORAGE_KEY, goal);
  } catch {
    /* quota / private mode */
  }
}
