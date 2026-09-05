import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mockGetVehicleWriteAccess = vi.fn();
const mockBeginFreeScanSession = vi.fn();
const mockValidateFreeScanSession = vi.fn();
const mockUserHasActiveMembership = vi.fn();
const mockAssertVehicleDocumentWrite = vi.fn();

vi.mock("@/lib/auth/vehicle-write-access", () => ({
  getVehicleWriteAccess: (...args: unknown[]) =>
    mockGetVehicleWriteAccess(...args),
  writeAccessErrorMessage: () => "forbidden",
}));

vi.mock("@/lib/billing/free-scan-quota", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/billing/free-scan-quota")>();
  return {
    ...actual,
    beginFreeScanSession: (...args: unknown[]) =>
      mockBeginFreeScanSession(...args),
    validateFreeScanSession: (...args: unknown[]) =>
      mockValidateFreeScanSession(...args),
  };
});

vi.mock("@/lib/billing/membership-store", () => ({
  userHasActiveMembership: (...args: unknown[]) =>
    mockUserHasActiveMembership(...args),
}));

vi.mock("@/lib/permissions/require-feature", () => ({
  assertVehicleDocumentWrite: (...args: unknown[]) =>
    mockAssertVehicleDocumentWrite(...args),
}));

const vehicleId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";
const sessionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("requireVehicleOcrAccess", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetVehicleWriteAccess.mockReset();
    mockBeginFreeScanSession.mockReset();
    mockValidateFreeScanSession.mockReset();
    mockUserHasActiveMembership.mockReset();
    mockAssertVehicleDocumentWrite.mockReset();

    mockGetVehicleWriteAccess.mockResolvedValue({
      ok: true,
      ownerUserId: ownerId,
      isOwner: true,
      isContributor: false,
    });
    mockAssertVehicleDocumentWrite.mockResolvedValue({ ok: true });
    mockUserHasActiveMembership.mockResolvedValue(false);
    mockValidateFreeScanSession.mockResolvedValue(false);
  });

  it("begins a complimentary session on first invoice OCR", async () => {
    mockBeginFreeScanSession.mockResolvedValue({
      ok: true,
      sessionId,
      started: true,
    });

    const { requireVehicleOcrAccess } = await import("./require-vehicle-ocr");
    const result = await requireVehicleOcrAccess(
      ownerId,
      vehicleId,
      undefined,
      "invoice",
      null,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scanSessionId).toBe(sessionId);
      expect(result.freeScanSessionStarted).toBe(true);
    }
    expect(mockBeginFreeScanSession).toHaveBeenCalledWith(
      ownerId,
      "invoice",
      vehicleId,
      null,
    );
  });

  it("reuses validated session on follow-up OCR calls", async () => {
    mockValidateFreeScanSession.mockResolvedValue(true);

    const { requireVehicleOcrAccess } = await import("./require-vehicle-ocr");
    const result = await requireVehicleOcrAccess(
      ownerId,
      vehicleId,
      undefined,
      "invoice",
      sessionId,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scanSessionId).toBe(sessionId);
      expect(result.freeScanSessionStarted).toBe(false);
    }
    expect(mockBeginFreeScanSession).not.toHaveBeenCalled();
    expect(mockAssertVehicleDocumentWrite).toHaveBeenCalledWith(
      expect.objectContaining({ ownerUserId: ownerId }),
      expect.anything(),
      expect.objectContaining({ validatedFreeScanSession: true }),
    );
  });

  it("returns subscription response when session begin is exhausted", async () => {
    mockBeginFreeScanSession.mockResolvedValue({
      ok: false,
      code: "free_scan_exhausted",
    });

    const { requireVehicleOcrAccess } = await import("./require-vehicle-ocr");
    const result = await requireVehicleOcrAccess(
      ownerId,
      vehicleId,
      undefined,
      "invoice",
      null,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response).toBeInstanceOf(NextResponse);
      expect(result.response.status).toBe(403);
    }
  });
});
