const STORAGE_KEY = "zt_showcase_share_prompt_v1";

type Stored = {
  v: 1;
  dismissedVehicleIds: string[];
};

function readStored(): Stored {
  if (typeof window === "undefined") {
    return { v: 1, dismissedVehicleIds: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { v: 1, dismissedVehicleIds: [] };
    const parsed = JSON.parse(raw) as Partial<Stored>;
    if (parsed.v !== 1 || !Array.isArray(parsed.dismissedVehicleIds)) {
      return { v: 1, dismissedVehicleIds: [] };
    }
    return {
      v: 1,
      dismissedVehicleIds: parsed.dismissedVehicleIds.filter(
        (id) => typeof id === "string" && id.trim().length > 0,
      ),
    };
  } catch {
    return { v: 1, dismissedVehicleIds: [] };
  }
}

function writeStored(data: Stored): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota / private mode
  }
}

export function hasDismissedShowcaseSharePrompt(vehicleId: string): boolean {
  const id = vehicleId.trim();
  if (!id) return true;
  return readStored().dismissedVehicleIds.includes(id);
}

export function markShowcaseSharePromptDismissed(vehicleId: string): void {
  const id = vehicleId.trim();
  if (!id) return;
  const stored = readStored();
  if (stored.dismissedVehicleIds.includes(id)) return;
  writeStored({
    v: 1,
    dismissedVehicleIds: [...stored.dismissedVehicleIds, id],
  });
}
