import type { ReceiptKindResult } from "@/lib/receipt/receipt-kind";

export class ClassifyReceiptKindError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ClassifyReceiptKindError";
    this.code = code;
  }
}

export async function classifyReceiptKindClient(input: {
  file: File;
  vehicleId: string;
}): Promise<ReceiptKindResult> {
  const vehicleId = input.vehicleId.trim();
  if (!vehicleId) {
    throw new ClassifyReceiptKindError("vehicleId is required.", "bad_request");
  }

  const formData = new FormData();
  formData.set("vehicleId", vehicleId);
  formData.set("file", input.file);

  const response = await fetch("/api/ocr/classify-receipt", {
    method: "POST",
    body: formData,
    credentials: "same-origin",
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok: true; classification: ReceiptKindResult }
    | { ok: false; error?: string; code?: string }
    | null;

  if (!response.ok || !payload || payload.ok !== true) {
    const message =
      payload && payload.ok === false && typeof payload.error === "string"
        ? payload.error
        : "Beleg konnte nicht erkannt werden.";
    const code =
      payload && payload.ok === false && typeof payload.code === "string"
        ? payload.code
        : undefined;
    throw new ClassifyReceiptKindError(message, code);
  }

  return payload.classification;
}
