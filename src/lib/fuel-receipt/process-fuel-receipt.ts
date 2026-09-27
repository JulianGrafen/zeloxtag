import { compressDocumentFile } from "@/lib/documents/document-compression";

import {
  FuelReceiptProcessError,
  type FuelOcrApiError,
  type FuelOcrApiSuccess,
  type FuelReceiptExtraction,
} from "./types";

export type ProcessFuelReceiptInput = {
  file: File;
  vehicleId: string;
  tagUuid: string;
};

function parseApiError(payload: unknown): FuelOcrApiError | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (record.ok !== false) return null;
  const code = record.code;
  const error = record.error;
  if (typeof error !== "string") return null;
  const allowed = new Set([
    "bad_request",
    "config",
    "forbidden",
    "ocr_failed",
    "rate_limited",
  ]);
  if (typeof code !== "string" || !allowed.has(code)) {
    return { ok: false, error, code: "ocr_failed" };
  }
  return { ok: false, error, code: code as FuelOcrApiError["code"] };
}

export async function processFuelReceipt(
  input: ProcessFuelReceiptInput,
): Promise<FuelReceiptExtraction> {
  const vehicleId = input.vehicleId.trim();
  const tagUuid = input.tagUuid.trim();
  if (!vehicleId || !tagUuid) {
    throw new FuelReceiptProcessError("Ungültige Anfrage.", "bad_request");
  }

  const compressed = await compressDocumentFile(input.file);
  const formData = new FormData();
  formData.set("vehicleId", vehicleId);
  formData.set("tagUuid", tagUuid);
  formData.set("file", compressed.file, compressed.file.name);

  const response = await fetch("/api/ocr/fuel", {
    method: "POST",
    body: formData,
    credentials: "same-origin",
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new FuelReceiptProcessError(
      "Server-Antwort konnte nicht gelesen werden.",
      "ocr_failed",
    );
  }

  if (!response.ok) {
    const apiError = parseApiError(payload);
    throw new FuelReceiptProcessError(
      apiError?.error ?? "Beleg konnte nicht analysiert werden.",
      apiError?.code ?? "ocr_failed",
    );
  }

  const success = payload as FuelOcrApiSuccess;
  if (!success.ok || !success.extraction) {
    throw new FuelReceiptProcessError(
      "Ungültige Server-Antwort.",
      "ocr_failed",
    );
  }

  return success.extraction;
}
