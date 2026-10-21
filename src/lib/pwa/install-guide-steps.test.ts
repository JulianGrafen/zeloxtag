import { describe, expect, it } from "vitest";

import {
  PWA_ANDROID_CHROME_STEPS,
  PWA_DESKTOP_CHROME_STEPS,
  PWA_IOS_CHROME_STEPS,
  PWA_IOS_SAFARI_STEPS,
  resolveInstallGuideSteps,
} from "@/lib/pwa/install-guide-steps";

describe("resolveInstallGuideSteps", () => {
  it("returns Safari steps for safari track on any platform", () => {
    expect(resolveInstallGuideSteps("safari", "android")).toEqual(
      PWA_IOS_SAFARI_STEPS,
    );
  });

  it("returns platform-specific Chrome steps", () => {
    expect(resolveInstallGuideSteps("chrome", "android")).toEqual(
      PWA_ANDROID_CHROME_STEPS,
    );
    expect(resolveInstallGuideSteps("chrome", "ios")).toEqual(
      PWA_IOS_CHROME_STEPS,
    );
    expect(resolveInstallGuideSteps("chrome", "desktop")).toEqual(
      PWA_DESKTOP_CHROME_STEPS,
    );
  });

  it("appends native install slide only on Android and desktop", () => {
    const androidWithNative = resolveInstallGuideSteps("chrome", "android", {
      includeNativeInstall: true,
    });
    expect(androidWithNative.at(-1)?.id).toBe("chrome-native");

    const iosWithNative = resolveInstallGuideSteps("chrome", "ios", {
      includeNativeInstall: true,
    });
    expect(iosWithNative.some((s) => s.id === "chrome-native")).toBe(false);
  });
});
