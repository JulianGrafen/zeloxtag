export type InvoiceFramingStatus = "too_far" | "too_close" | "good" | "unknown";

export type InvoiceFramingMetrics = {
  /** Guide frame height relative to the viewfinder (0–1). */
  fillRatio: number;
  status: InvoiceFramingStatus;
  message: string;
};

const TOO_FAR_MAX = 0.58;
const TOO_CLOSE_MIN = 0.9;

/** Live distance/zoom hint from A4 guide size in the viewfinder. */
export function analyzeInvoiceCaptureFraming(
  guideHeightPx: number,
  containerHeightPx: number,
): InvoiceFramingMetrics {
  if (
    !Number.isFinite(guideHeightPx) ||
    !Number.isFinite(containerHeightPx) ||
    containerHeightPx < 1
  ) {
    return {
      fillRatio: 0,
      status: "unknown",
      message: "Rechnung ins weiße Feld legen",
    };
  }

  const fillRatio = guideHeightPx / containerHeightPx;

  if (fillRatio < TOO_FAR_MAX) {
    return {
      fillRatio,
      status: "too_far",
      message: "Näher heran — Rechnung größer im Rahmen (Zoom / Abstand)",
    };
  }

  if (fillRatio > TOO_CLOSE_MIN) {
    return {
      fillRatio,
      status: "too_close",
      message: "Etwas zurück — ganze Seite muss sichtbar sein",
    };
  }

  return {
    fillRatio,
    status: "good",
    message: "Abstand passt — bei grünem Rahmen auslösen",
  };
}

export function invoiceFramingReady(
  framing: InvoiceFramingMetrics | null,
): boolean {
  return framing?.status === "good";
}
