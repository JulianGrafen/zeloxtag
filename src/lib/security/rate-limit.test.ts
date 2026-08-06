import { describe, expect, it } from "vitest";

import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

describe("rateLimit", () => {
  it("allows requests under the limit", async () => {
    const cfg = RATE_LIMITS.upload;
    const key = `test:upload:${Date.now()}:${Math.random()}`;

    const result = await rateLimit({
      key,
      limit: cfg.limit,
      windowMs: cfg.windowMs,
    });

    expect(result.ok).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
    expect(result.retryAfterSec).toBe(0);
  });

  it("blocks requests once the limit is exceeded", async () => {
    const key = `test:block:${Date.now()}:${Math.random()}`;
    const limit = 2;
    const windowMs = 60_000;

    const first = await rateLimit({ key, limit, windowMs });
    const second = await rateLimit({ key, limit, windowMs });
    const third = await rateLimit({ key, limit, windowMs });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(third.ok).toBe(false);
    expect(third.remaining).toBe(0);
    expect(third.retryAfterSec).toBeGreaterThanOrEqual(1);
  });
});
