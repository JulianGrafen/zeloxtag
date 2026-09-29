import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getVehicleWriteAccess,
  writeAccessErrorMessage,
} from "@/lib/auth/vehicle-write-access";
import {
  beginFreeScanSession,
  parseScanSessionId,
  validateFreeScanSession,
} from "@/lib/billing/free-scan-quota";
import { userHasActiveMembership } from "@/lib/billing/membership-store";
import { MEMBERSHIP_REQUIRED_MESSAGE } from "@/lib/billing/pro-plan";
import {
  FEATURE,
  FREE_SCAN_EXHAUSTED_CODE,
} from "@/lib/permissions/feature-access";
import {
  assertVehicleDocumentWrite,
  type FeatureGateOptions,
} from "@/lib/permissions/require-feature";

import { subscriptionRequiredResponse } from "./api-guard";

const vehicleIdSchema = z.string().uuid();

const FUEL_GATE: FeatureGateOptions = { allowFreeFuelScan: true };

export type FuelOcrAccessSuccess = {
  ok: true;
  vehicleId: string;
  ownerUserId: string;
  scanSessionId?: string;
  freeScanSessionStarted?: boolean;
};

export type FuelOcrAccessResult =
  | FuelOcrAccessSuccess
  | { ok: false; response: NextResponse };

export async function requireFuelOcrAccess(
  userId: string,
  vehicleIdRaw: string,
  scanSessionIdRaw?: string | null,
): Promise<FuelOcrAccessResult> {
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
    console.error("[requireFuelOcrAccess] write access failed", error);
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

  if (!access.ok || !access.isOwner) {
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

  const ownerUserId = access.ownerUserId!;
  const existingSessionId = parseScanSessionId(scanSessionIdRaw);
  const hasValidatedSession =
    Boolean(existingSessionId) &&
    (await validateFreeScanSession(
      existingSessionId!,
      ownerUserId,
      parsed.data,
      "fuel",
    ));

  const featureCheck = await assertVehicleDocumentWrite(
    access,
    FEATURE.SCAN_AI_RECEIPT,
    hasValidatedSession
      ? { ...FUEL_GATE, validatedFreeScanSession: true }
      : FUEL_GATE,
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

  const needsFreeSession = !(await userHasActiveMembership(ownerUserId));

  if (needsFreeSession) {
    if (hasValidatedSession && existingSessionId) {
      return {
        ok: true,
        vehicleId: parsed.data,
        ownerUserId,
        scanSessionId: existingSessionId,
        freeScanSessionStarted: false,
      };
    }

    const session = await beginFreeScanSession(
      ownerUserId,
      "fuel",
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
      ownerUserId,
      scanSessionId: session.sessionId,
      freeScanSessionStarted: session.started,
    };
  }

  return {
    ok: true,
    vehicleId: parsed.data,
    ownerUserId,
  };
}

export function fuelOcrAccessFromFormData(
  formData: FormData,
  userId: string,
): Promise<FuelOcrAccessResult> {
  return requireFuelOcrAccess(
    userId,
    String(formData.get("vehicleId") ?? ""),
    parseScanSessionId(formData),
  );
}
