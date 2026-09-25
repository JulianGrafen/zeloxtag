import type { OrbState } from "thinking-orbs";

export type ScanProgressPhase = "compress" | "raster" | "ocr" | "save";

/** Map scan pipeline progress to thinking-orb animation states. */
export function progressToOrbState(
  percent: number,
  phase?: ScanProgressPhase,
): OrbState {
  const clamped = Math.max(0, Math.min(100, percent));

  if (phase === "compress") return "connecting";
  if (phase === "raster") return "working";
  if (phase === "save") return "weaving";
  if (phase === "ocr") {
    return clamped >= 85 ? "solving" : "searching";
  }

  if (clamped < 20) return "connecting";
  if (clamped < 55) return "working";
  if (clamped < 85) return "searching";
  if (clamped < 100) return "solving";
  return "breathing";
}

export const INVOICE_EXTRACT_STEPS = [
  "Vorbereiten",
  "Erkennen",
  "Fertig",
] as const;

export function activeInvoiceExtractStepIndex(percent: number): number {
  if (percent >= 98) return 2;
  if (percent >= 55) return 1;
  return 0;
}
