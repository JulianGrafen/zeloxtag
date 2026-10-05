import { describe, expect, it } from "vitest";

import {
  canStartAiScan,
  isScanFabLocked,
  resolveDashboardScanGate,
} from "./ai-scan-access";

describe("resolveDashboardScanGate", () => {
  it("opens paywall when free scans are exhausted", () => {
    expect(
      resolveDashboardScanGate({
        wantsScan: true,
        membershipActive: false,
        freeInvoiceRemaining: 0,
        freeAbeRemaining: 0,
        scanTypeRaw: null,
      }),
    ).toEqual({ initialScanType: null, showScanPaywall: true });
  });

  it("blocks invoice deep link when only abe free scan remains", () => {
    expect(
      resolveDashboardScanGate({
        wantsScan: true,
        membershipActive: false,
        freeInvoiceRemaining: 0,
        freeAbeRemaining: 1,
        scanTypeRaw: "invoice",
      }),
    ).toEqual({ initialScanType: null, showScanPaywall: true });
  });

  it("allows invoice deep link when invoice free scan remains", () => {
    expect(
      resolveDashboardScanGate({
        wantsScan: true,
        membershipActive: false,
        freeInvoiceRemaining: 1,
        freeAbeRemaining: 0,
        scanTypeRaw: "repair",
      }),
    ).toEqual({ initialScanType: "repair", showScanPaywall: false });
  });
});

describe("isScanFabLocked", () => {
  it("locks invoice FAB when invoice quota is used", () => {
    expect(isScanFabLocked(false, 0, 1, "invoice")).toBe(true);
    expect(isScanFabLocked(false, 0, 1, null)).toBe(false);
  });
});

describe("canStartAiScan", () => {
  it("requires pro for gutachten on free tier", () => {
    expect(canStartAiScan(false, 1, 1, "gutachten")).toBe(false);
    expect(canStartAiScan(true, 0, 0, "gutachten")).toBe(true);
  });
});
