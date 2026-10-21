import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPwaSnooze,
  isBeforeInstallPromptEvent,
  migrateLegacyInstallDismiss,
  persistPwaInstalled,
  persistPwaSnooze,
  PWA_INSTALL_DISMISS_KEY,
  PWA_INSTALL_INSTALLED_KEY,
  PWA_INSTALL_SNOOZE_UNTIL_KEY,
  readPwaInstalled,
  readPwaSnoozed,
  shouldOfferPwaInstallPrompt,
} from "@/lib/pwa/install";

vi.mock("@/lib/capacitor/platform", () => ({
  isNativeCapacitor: () => false,
}));

describe("isBeforeInstallPromptEvent", () => {
  it("accepts events with a prompt function", () => {
    const event = { prompt: () => Promise.resolve() } as unknown as Event;
    expect(isBeforeInstallPromptEvent(event)).toBe(true);
  });

  it("rejects plain events", () => {
    expect(isBeforeInstallPromptEvent(new Event("beforeinstallprompt"))).toBe(
      false,
    );
  });
});

describe("PWA install persistence", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    const localStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    };
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("navigator", { standalone: false, userAgent: "vitest" });
    vi.stubGlobal("window", {
      localStorage: localStorageMock,
      navigator: { standalone: false },
      matchMedia: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses stable storage keys", () => {
    expect(PWA_INSTALL_INSTALLED_KEY).toBe("zlx-pwa-installed");
    expect(PWA_INSTALL_SNOOZE_UNTIL_KEY).toBe("zlx-pwa-install-snooze-until");
  });

  it("migrates legacy permanent dismiss flag", () => {
    localStorage.setItem(PWA_INSTALL_DISMISS_KEY, "1");
    migrateLegacyInstallDismiss();
    expect(localStorage.getItem(PWA_INSTALL_DISMISS_KEY)).toBeNull();
  });

  it("marks installed and clears snooze", () => {
    persistPwaSnooze();
    expect(readPwaSnoozed()).toBe(true);
    persistPwaInstalled();
    expect(readPwaInstalled()).toBe(true);
    expect(readPwaSnoozed()).toBe(false);
  });

  it("expires snooze after until date", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    localStorage.setItem(PWA_INSTALL_SNOOZE_UNTIL_KEY, past);
    expect(readPwaSnoozed()).toBe(false);
  });

  it("shouldOfferPwaInstallPrompt when not installed or snoozed", () => {
    expect(shouldOfferPwaInstallPrompt()).toBe(true);
    persistPwaSnooze();
    expect(shouldOfferPwaInstallPrompt()).toBe(false);
    clearPwaSnooze();
    persistPwaInstalled();
    expect(shouldOfferPwaInstallPrompt()).toBe(false);
  });
});
