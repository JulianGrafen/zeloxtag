import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getVehicleWriteAccess,
  writeAccessErrorMessage,
} from "@/lib/auth/vehicle-write-access";
import {
  beginFreeScanSession,
  freeScanKindForDocumentType,
  parseScanSessionId,
  validateFreeScanSession,
} from "@/lib/billing/free-scan-quota";
import { userHasActiveMembership } from "@/lib/billing/membership-store";
import { MEMBERSHIP_REQUIRED_MESSAGE } from "@/lib/billing/pro-plan";
import {
  FEATURE,
  FREE_SCAN_EXHAUSTED_CODE,
  type FeatureFlag,
} from "@/lib/permissions/feature-access";
import {
  assertVehicleDocumentWrite,
  type FeatureGateOptions,
} from "@/lib/permissions/require-feature";
import type { OcrDocumentType } from "@/lib/ocr/ocr-types";

import { subscriptionRequiredResponse } from "./api-guard";

const vehicleIdSchema = z.string().uuid();

function ocrGateOptions(documentType?: OcrDocumentType): FeatureGateOptions {
  if (documentType === "invoice") return { allowFreeInvoiceScan: true };
  if (documentType === "abe") return { allowFreeAbeScan: true };
  return {};
}

function complimentaryGateEnabled(
  gateOptions: FeatureGateOptions,
  kind: ReturnType<typeof freeScanKindForDocumentType>,
): boolean {
  if (kind === "invoice") return gateOptions.allowFreeInvoiceScan === true;
  if (kind === "abe") return gateOptions.allowFreeAbeScan === true;
  return false;
}

export type VehicleOcrAccessSuccess = {
  ok: true;
  vehicleId: string;
  ownerUserId: string;
  scanSessionId?: string;
  freeScanSessionStarted?: boolean;
};

export type VehicleOcrAccessResult =
  | VehicleOcrAccessSuccess
  | { ok: false; response: NextResponse };

export async function requireVehicleOcrAccess(
  userId: string,
  vehicleIdRaw: string,
  feature: FeatureFlag = FEATURE.SCAN_AI_RECEIPT,
  documentType?: OcrDocumentType,
  scanSessionIdRaw?: string | null,
): Promise<VehicleOcrAccessResult> {
  const parsed = vehicleIdSchema.safeParse(vehicleIdRaw.trim());
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "vehicleId (UUID) is required.",
          code: "bad_request",
        },
        { status: 400 },
      ),
    };
  }

  let access;
  try {
    access = await getVehicleWriteAccess(parsed.data, userId);
  } catch (error) {
    console.error("[requireVehicleOcrAccess] write access failed", error);
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "Fahrzeugzugriff konnte nicht geprüft werden.",
          code: "config",
        },
        { status: 503 },
      ),
    };
  }

  if (!access.ok || !access.ownerUserId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: writeAccessErrorMessage(access),
          code: "forbidden",
        },
        { status: 403 },
      ),
    };
  }

  const gateOptions = ocrGateOptions(documentType);
  const freeKind = freeScanKindForDocumentType(documentType);
  const existingSessionId = parseScanSessionId(scanSessionIdRaw);
  const hasValidatedSession =
    Boolean(freeKind && existingSessionId) &&
    (await validateFreeScanSession(
      existingSessionId!,
      access.ownerUserId,
      parsed.data,
      freeKind!,
    ));

  const featureCheck = await assertVehicleDocumentWrite(
    access,
    feature,
    hasValidatedSession
      ? { ...gateOptions, validatedFreeScanSession: true }
      : gateOptions,
  );
  if (!featureCheck.ok) {
    return {
      ok: false,
      response: subscriptionRequiredResponse(
        featureCheck.message,
        featureCheck.code,
      ),
    };
  }

  const needsFreeSession =
    freeKind &&
    complimentaryGateEnabled(gateOptions, freeKind) &&
    !(await userHasActiveMembership(access.ownerUserId));

  if (needsFreeSession && freeKind) {
    if (hasValidatedSession && existingSessionId) {
      return {
        ok: true,
        vehicleId: parsed.data,
        ownerUserId: access.ownerUserId,
        scanSessionId: existingSessionId,
        freeScanSessionStarted: false,
      };
    }

    const session = await beginFreeScanSession(
      access.ownerUserId,
      freeKind,
      parsed.data,
      null,
    );

    if (!session.ok) {
      if (session.code === "free_scan_exhausted") {
        return {
          ok: false,
          response: subscriptionRequiredResponse(
            MEMBERSHIP_REQUIRED_MESSAGE,
            FREE_SCAN_EXHAUSTED_CODE,
          ),
        };
      }
      if (session.code === "invalid_session") {
        return {
          ok: false,
          response: NextResponse.json(
            {
              ok: false,
              error: "Scan-Sitzung abgelaufen. Bitte erneut starten.",
              code: "bad_request",
            },
            { status: 400 },
          ),
        };
      }
      return {
        ok: false,
        response: NextResponse.json(
          {
            ok: false,
            error: "Gratis-Scan-Kontingent konnte nicht geprüft werden.",
            code: "config",
          },
          { status: 503 },
        ),
      };
    }

    return {
      ok: true,
      vehicleId: parsed.data,
      ownerUserId: access.ownerUserId,
      scanSessionId: session.sessionId,
      freeScanSessionStarted: session.started,
    };
  }

  return {
    ok: true,
    vehicleId: parsed.data,
    ownerUserId: access.ownerUserId,
  };
}

/** Parse vehicle + session ids from multipart OCR requests. */
export function ocrAccessFromFormData(
  formData: FormData,
  userId: string,
  feature: FeatureFlag,
  documentType?: OcrDocumentType,
): Promise<VehicleOcrAccessResult> {
  return requireVehicleOcrAccess(
    userId,
    String(formData.get("vehicleId") ?? ""),
    feature,
    documentType,
    parseScanSessionId(formData),
  );
}
