import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  hasDismissedShowcaseSharePrompt,
  markShowcaseSharePromptDismissed,
} from "@/lib/onboarding/showcase-share-prompt";

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };

  vi.stubGlobal("window", { localStorage: localStorageMock });
  vi.stubGlobal("localStorage", localStorageMock);
}

beforeEach(() => {
  installMemoryLocalStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("showcase-share-prompt storage", () => {
  it("tracks dismissal per vehicle", () => {
    expect(hasDismissedShowcaseSharePrompt("veh-a")).toBe(false);
    markShowcaseSharePromptDismissed("veh-a");
    expect(hasDismissedShowcaseSharePrompt("veh-a")).toBe(true);
    expect(hasDismissedShowcaseSharePrompt("veh-b")).toBe(false);
  });
});
