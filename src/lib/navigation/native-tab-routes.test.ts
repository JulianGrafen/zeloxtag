import { describe, expect, it } from "vitest";

import {
  isNativeTabActive,
  NATIVE_TAB_DEFINITIONS,
  resolveNativeTabHref,
} from "./native-tab-routes";

describe("native tab routes", () => {
  it("resolves dynamic garage and scan hrefs", () => {
    const garage = NATIVE_TAB_DEFINITIONS[0]!;
    const scan = NATIVE_TAB_DEFINITIONS[2]!;
    expect(resolveNativeTabHref(garage, "/v/abc", "/v/abc?scan=1")).toBe(
      "/v/abc",
    );
    expect(resolveNativeTabHref(scan, "/v/abc", "/v/abc?scan=1")).toBe(
      "/v/abc?scan=1",
    );
  });

  it("detects active swipe, settings, and scan query", () => {
    const swipe = NATIVE_TAB_DEFINITIONS[1]!;
    const settings = NATIVE_TAB_DEFINITIONS[3]!;
    const scan = NATIVE_TAB_DEFINITIONS[2]!;
    expect(isNativeTabActive("/swipe", swipe)).toBe(true);
    expect(isNativeTabActive("/settings/security", settings)).toBe(true);
    expect(isNativeTabActive("/v/tag?scan=1", scan)).toBe(true);
  });
});
