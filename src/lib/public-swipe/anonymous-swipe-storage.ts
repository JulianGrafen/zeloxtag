import { showcaseCalendarWeekKey } from "@/lib/showcase/showcase-calendar-week";

const STORAGE_KEY = "zt_public_anonymous_swipe_v1";

export type AnonymousSwipeStorageState = {
  v: 2;
  sessionId: string;
  sessionHash: string | null;
  /** Berlin calendar week (Monday YMD) — deck + gate reset each Monday. */
  calendarWeekKey: string;
  swipedCarIds: string[];
  swipeCount: number;
};

type LegacyAnonymousSwipeStorageState = {
  v: 1;
  sessionId: string;
  sessionHash: string | null;
  swipedCarIds: string[];
  swipeCount: number;
};

function emptyState(sessionId: string, weekKey: string): AnonymousSwipeStorageState {
  return {
    v: 2,
    sessionId,
    sessionHash: null,
    calendarWeekKey: weekKey,
    swipedCarIds: [],
    swipeCount: 0,
  };
}

export function normalizeAnonymousSwipeStorage(
  state: AnonymousSwipeStorageState,
  currentWeekKey: string = showcaseCalendarWeekKey(),
): AnonymousSwipeStorageState {
  if (state.calendarWeekKey === currentWeekKey) {
    return state;
  }
  return {
    ...state,
    calendarWeekKey: currentWeekKey,
    swipedCarIds: [],
    swipeCount: 0,
  };
}

function readRaw(): AnonymousSwipeStorageState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as
      | AnonymousSwipeStorageState
      | LegacyAnonymousSwipeStorageState;
    if (typeof parsed.sessionId !== "string") return null;

    const weekKey = showcaseCalendarWeekKey();

    if (parsed.v === 2) {
      const state: AnonymousSwipeStorageState = {
        v: 2,
        sessionId: parsed.sessionId,
        sessionHash:
          typeof parsed.sessionHash === "string" ? parsed.sessionHash : null,
        calendarWeekKey:
          typeof parsed.calendarWeekKey === "string"
            ? parsed.calendarWeekKey
            : weekKey,
        swipedCarIds: Array.isArray(parsed.swipedCarIds)
          ? parsed.swipedCarIds.filter((id) => typeof id === "string")
          : [],
        swipeCount:
          typeof parsed.swipeCount === "number" && parsed.swipeCount >= 0
            ? Math.floor(parsed.swipeCount)
            : 0,
      };
      return normalizeAnonymousSwipeStorage(state, weekKey);
    }

    if (parsed.v === 1) {
      return emptyState(parsed.sessionId, weekKey);
    }

    return null;
  } catch {
    return null;
  }
}

function write(state: AnonymousSwipeStorageState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createAnonymousSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `anon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function hashAnonymousSessionId(sessionId: string): Promise<string> {
  const encoded = new TextEncoder().encode(sessionId);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  throw new Error("Secure session hashing unavailable");
}

export function loadAnonymousSwipeStorage(): AnonymousSwipeStorageState {
  const existing = readRaw();
  if (existing) return existing;
  const sessionId = createAnonymousSessionId();
  const state = emptyState(sessionId, showcaseCalendarWeekKey());
  write(state);
  return state;
}

export function saveAnonymousSwipeStorage(
  state: AnonymousSwipeStorageState,
): AnonymousSwipeStorageState {
  const normalized = normalizeAnonymousSwipeStorage(state);
  write(normalized);
  return normalized;
}

export const ANONYMOUS_SWIPE_GATE_LIMIT = 7;
