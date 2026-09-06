"use client";

import { toast } from "sonner";

import { AUTOMOTIVE_REJECTION_CODE } from "@/lib/ocr/automotive-context-schema";

export { AUTOMOTIVE_REJECTION_CODE as DOCUMENT_REJECTED_CODE };

export function isDocumentRejectedPayload(
  payload: unknown,
): payload is { ok: false; error?: string; code?: string } {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as { ok?: unknown; code?: unknown };
  return record.ok === false && record.code === AUTOMOTIVE_REJECTION_CODE;
}

export function readOcrErrorPayload(payload: unknown): {
  message: string;
  code?: string;
} {
  if (payload && typeof payload === "object") {
    const record = payload as { error?: unknown; code?: unknown };
    const message =
      typeof record.error === "string" && record.error.trim().length > 0
        ? record.error.trim()
        : "Analyse fehlgeschlagen.";
    const code =
      typeof record.code === "string" && record.code.trim().length > 0
        ? record.code.trim()
        : undefined;
    return { message, code };
  }
  return { message: "Analyse fehlgeschlagen." };
}

export function notifyOcrError(message: string, code?: string): void {
  if (code === AUTOMOTIVE_REJECTION_CODE) {
    toast.error(message);
    return;
  }
  toast.error(message);
}
