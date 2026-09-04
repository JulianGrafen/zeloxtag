import { describe, expect, it } from "vitest";

import {
  FREE_SCAN_EXHAUSTED_CODE,
  SUBSCRIPTION_REQUIRED_CODE,
} from "@/lib/permissions/feature-access";
import { subscriptionRequiredResponse } from "@/lib/security/api-guard";

describe("subscriptionRequiredResponse", () => {
  it("returns 403 Forbidden for direct API paywall bypass", async () => {
    const response = subscriptionRequiredResponse();
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body).toEqual({
      ok: false,
      error: expect.any(String),
      code: SUBSCRIPTION_REQUIRED_CODE,
    });
  });

  it("returns free-scan exhausted code when quota is spent", async () => {
    const response = subscriptionRequiredResponse(
      "Gratis-Scans aufgebraucht.",
      FREE_SCAN_EXHAUSTED_CODE,
    );
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.code).toBe(FREE_SCAN_EXHAUSTED_CODE);
  });
});
