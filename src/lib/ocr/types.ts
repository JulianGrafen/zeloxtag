export const INVOICE_OCR_CATEGORIES = [
  "tuning",
  "service",
  "repair",
  "inspection",
] as const;

export type InvoiceOcrCategory = (typeof INVOICE_OCR_CATEGORIES)[number];

/** Strict OCR payload returned by gpt-4o-mini structured output. */
export type InvoiceOcrFields = {
  vendor: string;
  date: string | null;
  amount: number | null;
  category: InvoiceOcrCategory;
};

export type OcrApiSuccess = {
  ok: true;
  ocr: InvoiceOcrFields;
  document: {
    id: string;
    vehicle_id: string;
    title: string;
    type: "invoice" | "tuev";
    file_url: string;
    amount: number | null;
    date: string | null;
    category: InvoiceOcrCategory;
    created_at: string;
  };
};

export type OcrApiError = {
  ok: false;
  error: string;
  code?:
    | "unauthorized"
    | "forbidden"
    | "bad_request"
    | "ocr_failed"
    | "storage_failed"
    | "config";
};
