import {
  isComplimentaryAbeScanType,
  isInvoiceFamilyScanType,
  parseScanType,
  type ScanType,
} from "@/lib/documents/scan-types";

export type DashboardScanGateInput = {
  wantsScan: boolean;
  membershipActive: boolean;
  freeInvoiceRemaining: number;
  freeAbeRemaining: number;
  freeFuelRemaining?: number;
  scanTypeRaw?: string | null;
};

export type DashboardScanGate = {
  /** Pass `initialScanType` when the uploader may open immediately. */
  initialScanType: ScanType | null;
  /** Deep link should land on paywall instead of picker/uploader. */
  showScanPaywall: boolean;
};

export function canUseFreeScanForType(
  scanType: ScanType,
  freeInvoiceRemaining: number,
  freeAbeRemaining: number,
): boolean {
  if (isInvoiceFamilyScanType(scanType)) {
    return freeInvoiceRemaining > 0;
  }
  if (isComplimentaryAbeScanType(scanType)) {
    return freeAbeRemaining > 0;
  }
  return false;
}

function hasAnyFreeInvoiceOrAbeScan(
  freeInvoiceRemaining: number,
  freeAbeRemaining: number,
): boolean {
  return freeInvoiceRemaining > 0 || freeAbeRemaining > 0;
}

export function canStartAiScan(
  membershipActive: boolean,
  freeInvoiceRemaining: number,
  freeAbeRemaining: number,
  scanType?: ScanType | null,
  _freeFuelRemaining = 0,
): boolean {
  if (membershipActive) return true;
  if (scanType) {
    return canUseFreeScanForType(
      scanType,
      freeInvoiceRemaining,
      freeAbeRemaining,
    );
  }
  return hasAnyFreeInvoiceOrAbeScan(
    freeInvoiceRemaining,
    freeAbeRemaining,
  );
}

/** Owner dashboard / garage `?scan=1` deep-link handling. */
export function resolveDashboardScanGate(
  input: DashboardScanGateInput,
): DashboardScanGate {
  const {
    wantsScan,
    membershipActive,
    freeInvoiceRemaining,
    freeAbeRemaining,
    scanTypeRaw,
  } = input;

  if (!wantsScan) {
    return { initialScanType: null, showScanPaywall: false };
  }

  const parsed = parseScanType(scanTypeRaw);

  if (membershipActive) {
    return { initialScanType: parsed, showScanPaywall: false };
  }

  if (!parsed) {
    const hasAnyFree = hasAnyFreeInvoiceOrAbeScan(
      freeInvoiceRemaining,
      freeAbeRemaining,
    );
    return {
      initialScanType: null,
      showScanPaywall: !hasAnyFree,
    };
  }

  if (canUseFreeScanForType(parsed, freeInvoiceRemaining, freeAbeRemaining)) {
    return { initialScanType: parsed, showScanPaywall: false };
  }

  return { initialScanType: null, showScanPaywall: true };
}

export function isScanFabLocked(
  membershipActive: boolean,
  freeInvoiceRemaining: number,
  freeAbeRemaining: number,
  scanTypeRaw?: string | null,
  _freeFuelRemaining = 0,
): boolean {
  if (membershipActive) return false;
  const parsed = parseScanType(scanTypeRaw);
  if (!parsed) {
    return !hasAnyFreeInvoiceOrAbeScan(
      freeInvoiceRemaining,
      freeAbeRemaining,
    );
  }
  return !canUseFreeScanForType(
    parsed,
    freeInvoiceRemaining,
    freeAbeRemaining,
  );
}
