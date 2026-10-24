import { afterEach, describe, expect, it, vi } from "vitest";

import {
  canUseWebVibrate,
  playWebHapticTap,
  WEB_HAPTIC_TAP_MS,
} from "./web-haptics";

describe("web-haptics", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports vibrate support when API exists", () => {
    vi.stubGlobal("navigator", { vibrate: vi.fn() });
    expect(canUseWebVibrate()).toBe(true);
  });

  it("fires a 15ms pulse", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: false }),
    });
    playWebHapticTap();
    expect(vibrate).toHaveBeenCalledWith(WEB_HAPTIC_TAP_MS);
  });

  it("skips when reduced motion is on", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: true }),
    });
    playWebHapticTap();
    expect(vibrate).not.toHaveBeenCalled();
  });
});
