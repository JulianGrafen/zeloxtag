import type { ReceiptKind } from "@/lib/receipt/receipt-kind";

export type ReceiptRouteTarget = "fuel" | "workshop";

export function receiptKindToRouteTarget(
  kind: ReceiptKind,
): ReceiptRouteTarget | null {
  if (kind === "fuel_receipt") return "fuel";
  if (kind === "workshop_invoice") return "workshop";
  return null;
}
