import { describe, expect, it } from "vitest";

import {
  APP_INVITE_UTM_SOURCE,
  buildAppInviteRegisterUrl,
  buildAppInviteSharePayload,
} from "@/lib/share/app-invite";

describe("buildAppInviteRegisterUrl", () => {
  it("points to register with invite utm params", () => {
    const href = buildAppInviteRegisterUrl("https://app.zeloxtag.de");
    expect(href).toBe(
      `https://app.zeloxtag.de/register?utm_source=${APP_INVITE_UTM_SOURCE}&utm_medium=share`,
    );
  });
});

describe("buildAppInviteSharePayload", () => {
  it("includes registration url and share copy", () => {
    const payload = buildAppInviteSharePayload("https://app.zeloxtag.de");
    expect(payload.url).toContain("/register");
    expect(payload.title).toMatch(/ZeloxTag/);
    expect(payload.text.length).toBeGreaterThan(20);
  });
});
