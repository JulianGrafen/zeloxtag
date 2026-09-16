import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import {
  isAuthorizedCronRequest,
  isCronApiPath,
} from "./cron-auth";

describe("isCronApiPath", () => {
  it("matches scheduled cron routes", () => {
    expect(isCronApiPath("/api/cron/pro-trial-reminders", "GET")).toBe(true);
    expect(isCronApiPath("/api/cron/purge-account-deletions", "HEAD")).toBe(
      true,
    );
  });

  it("rejects non-cron APIs", () => {
    expect(isCronApiPath("/api/cron/evil", "POST")).toBe(false);
    expect(isCronApiPath("/api/documents/file", "GET")).toBe(false);
  });
});

describe("isAuthorizedCronRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts Bearer CRON_SECRET", () => {
    vi.stubEnv("CRON_SECRET", "test-secret-value");
    const request = new NextRequest("https://app.zeloxtag.de/api/cron/x", {
      headers: { authorization: "Bearer test-secret-value" },
    });
    expect(isAuthorizedCronRequest(request)).toBe(true);
  });

  it("rejects missing or wrong bearer", () => {
    vi.stubEnv("CRON_SECRET", "test-secret-value");
    const request = new NextRequest("https://app.zeloxtag.de/api/cron/x");
    expect(isAuthorizedCronRequest(request)).toBe(false);
  });
});
