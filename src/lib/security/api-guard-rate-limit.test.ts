import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRateLimit = vi.fn();

vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>();
  return {
    ...actual,
    rateLimit: (...args: unknown[]) => mockRateLimit(...args),
  };
});

describe("enforceRateLimit", () => {
  beforeEach(() => {
    mockRateLimit.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 429 for OCR when the rate-limit backend fails", async () => {
    mockRateLimit.mockRejectedValue(new Error("rpc down"));
    const { enforceRateLimit } = await import("./api-guard");

    const request = new NextRequest("https://app.zeloxtag.de/api/ocr/invoice", {
      method: "POST",
    });
    const response = await enforceRateLimit(request, "ocr", "invoice");

    expect(response?.status).toBe(429);
    const body = await response?.json();
    expect(body).toMatchObject({ ok: false, code: "rate_limited" });
  });

  it("returns 429 for upload when the rate-limit backend fails", async () => {
    mockRateLimit.mockRejectedValue(new Error("rpc down"));
    const { enforceRateLimit } = await import("./api-guard");

    const request = new NextRequest("https://app.zeloxtag.de/api/documents/analyze", {
      method: "POST",
    });
    const response = await enforceRateLimit(request, "upload", "analyze");

    expect(response?.status).toBe(429);
  });

  it("stays fail-open for generic public GET helpers", async () => {
    mockRateLimit.mockRejectedValue(new Error("rpc down"));
    const { enforceRateLimit } = await import("./api-guard");

    const request = new NextRequest(
      "https://app.zeloxtag.de/api/public/vehicle/11111111-1111-4111-8111-111111111111/file?src=x",
      { method: "GET" },
    );
    const response = await enforceRateLimit(request, "apiDefault", "public-file");

    expect(response).toBeNull();
  });
});
