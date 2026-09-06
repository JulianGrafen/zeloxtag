import "server-only";

import { NextResponse } from "next/server";

import { parseScanSessionId } from "@/lib/billing/free-scan-quota";
import {
  AUTOMOTIVE_REJECTION_CODE,
  AUTOMOTIVE_REJECTION_MESSAGE,
  AutomotiveContextRejectedError,
  isAutomotiveContextRejectedError,
  runAutomotiveGate,
} from "@/lib/ocr/verify-automotive-context";
import type { FileValidationSuccess } from "@/lib/security/file-upload";

export type AutomotiveGateErrorBody = {
  ok: false;
  error: string;
  code: typeof AUTOMOTIVE_REJECTION_CODE;
};

export function automotiveGateRejectedResponse(
  error: string = AUTOMOTIVE_REJECTION_MESSAGE,
): NextResponse<AutomotiveGateErrorBody> {
  return NextResponse.json(
    {
      ok: false,
      error,
      code: AUTOMOTIVE_REJECTION_CODE,
    },
    { status: 422 },
  );
}

export function automotiveGateErrorFromCaught(
  error: unknown,
): NextResponse<AutomotiveGateErrorBody> | null {
  if (isAutomotiveContextRejectedError(error)) {
    return automotiveGateRejectedResponse(error.message);
  }
  return null;
}

function shouldSkipAutomotiveGate(formData: FormData): boolean {
  const sessionId = parseScanSessionId(
    String(formData.get("scanSessionId") ?? ""),
  );
  return sessionId !== null;
}

/**
 * Tier-1 gatekeeper for OCR API routes. Returns a 422 response when rejected,
 * or null when extraction may proceed. Skips when reusing an OCR scan session.
 */
export async function enforceAutomotiveGateFromFormData(
  formData: FormData,
  fileCheck: FileValidationSuccess,
): Promise<NextResponse<AutomotiveGateErrorBody> | null> {
  if (shouldSkipAutomotiveGate(formData)) {
    return null;
  }

  const bytes = Buffer.from(fileCheck.bytes);
  const gate = await runAutomotiveGate(bytes, fileCheck.mime);
  if (!gate.ok) {
    return automotiveGateRejectedResponse(gate.error);
  }

  return null;
}

export { AutomotiveContextRejectedError };
