import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getVehicleWriteAccess,
  writeAccessErrorMessage,
} from "@/lib/auth/vehicle-write-access";
import {
  FEATURE,
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

export async function requireVehicleOcrAccess(
  userId: string,
  vehicleIdRaw: string,
  feature: FeatureFlag = FEATURE.SCAN_AI_RECEIPT,
  documentType?: OcrDocumentType,
): Promise<
  | { ok: true; vehicleId: string; ownerUserId: string }
  | { ok: false; response: NextResponse }
> {
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

  const featureCheck = await assertVehicleDocumentWrite(
    access,
    feature,
    ocrGateOptions(documentType),
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

  return {
    ok: true,
    vehicleId: parsed.data,
    ownerUserId: access.ownerUserId,
  };
}
