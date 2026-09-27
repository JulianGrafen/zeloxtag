/** Vision extraction from a fuel station receipt (no persistence). */
export type FuelReceiptExtraction = {
  date: string | null;
  totalAmount: number | null;
  liters: number | null;
};

export type FuelFillFormState = {
  occurredOn: string;
  amountEur: string;
  fuelLiters: string;
  odometerKm: string;
  note: string;
};

export type FuelOcrApiSuccess = {
  ok: true;
  extraction: FuelReceiptExtraction;
};

export type FuelOcrApiErrorCode =
  | "bad_request"
  | "config"
  | "forbidden"
  | "ocr_failed"
  | "rate_limited";

export type FuelOcrApiError = {
  ok: false;
  error: string;
  code: FuelOcrApiErrorCode;
};

export class FuelReceiptProcessError extends Error {
  readonly code: FuelOcrApiErrorCode;

  constructor(message: string, code: FuelOcrApiErrorCode = "ocr_failed") {
    super(message);
    this.name = "FuelReceiptProcessError";
    this.code = code;
  }
}
