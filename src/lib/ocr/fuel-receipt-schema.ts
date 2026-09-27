import type { FuelReceiptExtraction } from "@/lib/fuel-receipt/types";

export const FUEL_RECEIPT_OCR_JSON_SCHEMA = {
  name: "fuel_station_receipt_ocr",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["date", "totalAmount", "liters"],
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
        description: "Fuel volume in liters, or null if unreadable.",
      },
    },
  },
} as const;

export type FuelReceiptOcrFields = {
  date: string | null;
  totalAmount: number | null;
  liters: number | null;
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

  return true;
}

export function normalizeFuelReceiptOcrFields(
  fields: FuelReceiptOcrFields,
): FuelReceiptExtraction {
  const totalAmount =
    typeof fields.totalAmount === "number" && fields.totalAmount > 0
      ? Math.round(fields.totalAmount * 100) / 100
      : null;

  const liters =
    typeof fields.liters === "number" && fields.liters > 0
      ? Math.round(fields.liters * 100) / 100
      : null;

  return {
    date: fields.date,
    totalAmount,
    liters,
  };
}
