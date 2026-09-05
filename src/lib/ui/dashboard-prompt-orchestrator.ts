"use client";

export type DashboardPromptPhase = "tour" | "silhouette" | "pwa" | "idle";

export const DASHBOARD_FAB_CLEARANCE =
  "calc(max(1rem, env(safe-area-inset-bottom)) + 5.5rem)";

const CHANGE_EVENT = "zlx-dashboard-prompt-change";

type Snapshot = {
  phase: DashboardPromptPhase;
  silhouetteAllowed: boolean;
  pwaAllowed: boolean;
};

let snapshot: Snapshot = {
  phase: "idle",
  silhouetteAllowed: false,
  pwaAllowed: false,
};

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function getDashboardPromptSnapshot(): Snapshot {
  return snapshot;
}

export function setDashboardPromptPhase(phase: DashboardPromptPhase): void {
  snapshot = {
    phase,
    silhouetteAllowed: phase === "silhouette",
    pwaAllowed: phase === "pwa",
  };
  emit();
}

export function subscribeDashboardPrompts(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

export function isVehicleDashboardPath(pathname: string): boolean {
  return /^\/v\/[^/]+$/.test(pathname);
}

export function resetDashboardPromptOrchestrator(): void {
  snapshot = {
    phase: "idle",
    silhouetteAllowed: false,
    pwaAllowed: false,
  };
  emit();
}
