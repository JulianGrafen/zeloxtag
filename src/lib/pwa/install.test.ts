import { describe, expect, it } from "vitest";

import {
  isBeforeInstallPromptEvent,
  PWA_INSTALL_DISMISS_KEY,
} from "@/lib/pwa/install";

describe("isBeforeInstallPromptEvent", () => {
  it("accepts events with a prompt function", () => {
    const event = { prompt: () => Promise.resolve() } as Event;
    expect(isBeforeInstallPromptEvent(event)).toBe(true);
  });

  it("rejects plain events", () => {
    expect(isBeforeInstallPromptEvent(new Event("beforeinstallprompt"))).toBe(
      false,
    );
  });
});

describe("PWA_INSTALL_DISMISS_KEY", () => {
  it("uses a stable storage key", () => {
    expect(PWA_INSTALL_DISMISS_KEY).toBe("zlx-pwa-install-dismissed");
  });
});
