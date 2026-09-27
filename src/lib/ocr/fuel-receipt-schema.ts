import type { FuelReceiptExtraction } from "@/lib/fuel-receipt/types";

import { reconcileFuelLiters } from "./fuel-receipt-reconcile";

export const FUEL_RECEIPT_OCR_JSON_SCHEMA = {
  name: "fuel_station_receipt_ocr",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["date", "totalAmount", "liters", "pricePerLiter"],
    properties: {
      date: {
        type: ["string", "null"],
        description: "Receipt date in YYYY-MM-DD, or null if unreadable.",
      },
      totalAmount: {
        type: ["number", "null"],
        description:
          "Total amount paid (gross) in EUR as a number, or null if unreadable.",
      },
      liters: {
        type: ["number", "null"],
        description:
          "Dispensed fuel VOLUME in liters (Menge, Liter, L, dm³) — not €/L. " +
          "Example: 42.38 for a fill, not 1.89.",
      },
      pricePerLiter: {
        type: ["number", "null"],
        description:
          "Unit price in EUR per liter (Literpreis, €/L, Preis/L) if printed, else null.",
      },
    },
  },
} as const;

export type FuelReceiptOcrFields = {
  date: string | null;
  totalAmount: number | null;
  liters: number | null;
  pricePerLiter: number | null;
};

export function isFuelReceiptOcrFields(value: unknown): value is FuelReceiptOcrFields {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;

  if (!(record.date === null || typeof record.date === "string")) return false;
  if (
    !(
      record.totalAmount === null || typeof record.totalAmount === "number"
    )
  ) {
    return false;
  }
  if (!(record.liters === null || typeof record.liters === "number")) {
    return false;
  }
  if (
    !(
      record.pricePerLiter === null || typeof record.pricePerLiter === "number"
    )
  ) {
    return false;
  }

  if (
    typeof record.date === "string" &&
    !/^\d{4}-\d{2}-\d{2}$/.test(record.date)
  ) {
    return false;
  }

  if (
    typeof record.totalAmount === "number" &&
    !Number.isFinite(record.totalAmount)
  ) {
    return false;
  }

  if (typeof record.liters === "number" && !Number.isFinite(record.liters)) {
    return false;
  }

  if (
    typeof record.pricePerLiter === "number" &&
    !Number.isFinite(record.pricePerLiter)
  ) {
    return false;
  }

  return true;
}

export function normalizeFuelReceiptOcrFields(
  fields: FuelReceiptOcrFields,
): FuelReceiptExtraction {
  const totalAmount =
    typeof fields.totalAmount === "number" && fields.totalAmount > 0
      ? Math.round(fields.totalAmount * 100) / 100
      : null;

  const liters = reconcileFuelLiters({
    liters: fields.liters,
    totalAmount,
    pricePerLiter: fields.pricePerLiter,
  });

  return {
    date: fields.date,
    totalAmount,
    liters,
  };
}
