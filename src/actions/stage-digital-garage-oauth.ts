"use server";

import { headers } from "next/headers";

import {
  DIGITAL_GARAGE_BETA_FULL_MESSAGE,
  getDigitalGarageBetaStatus,
  isDigitalGarageBetaClosed,
} from "@/lib/onboarding/digital-garage-beta";
import { normalizeGarageVehiclePayload } from "@/lib/hardware/normalize-garage-vehicle-payload";
import { setPendingGarageVehicle } from "@/lib/hardware/pending-garage-vehicle";
import {
  authClientKeyFromHeaders,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";
import {
  logServerError,
  publicClientMessage,
} from "@/lib/security/public-error";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { GarageVehiclePayloadInput } from "@/lib/hardware/normalize-garage-vehicle-payload";

export type StageDigitalGarageOAuthResult =
  | { status: "ok" }
  | { status: "error"; message: string };

/**
 * Persists wizard vehicle data before OAuth redirect (digital garage register).
 */
export async function stageDigitalGarageForOAuth(
  input: GarageVehiclePayloadInput,
): Promise<StageDigitalGarageOAuthResult> {
  let payload;
  try {
    payload = normalizeGarageVehiclePayload(input);
  } catch (error) {
    return {
      status: "error",
      message: publicClientMessage(error, "Ungültige Fahrzeugdaten."),
    };
  }

  try {
    const headerStore = await headers();
    const clientKey = authClientKeyFromHeaders(headerStore);
    const limited = await rateLimit({
      key: `auth:garage-oauth-stage:${clientKey}`,
      limit: RATE_LIMITS.auth.limit,
      windowMs: RATE_LIMITS.auth.windowMs,
    });
    if (!limited.ok) {
      return {
        status: "error",
        message: `Zu viele Versuche. Bitte in ${limited.retryAfterSec}s erneut versuchen.`,
      };
    }
  } catch (error) {
    console.error("[garage-oauth-stage] rate limit skipped", error);
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return { status: "ok" };
  }

  const betaStatus = await getDigitalGarageBetaStatus();
  if (isDigitalGarageBetaClosed(betaStatus)) {
    return { status: "error", message: DIGITAL_GARAGE_BETA_FULL_MESSAGE };
  }

  try {
    await setPendingGarageVehicle(payload);
    return { status: "ok" };
  } catch (error) {
    logServerError("[garage-oauth-stage] pending save failed", error);
    return {
      status: "error",
      message: "Fahrzeugdaten konnten nicht gespeichert werden.",
    };
  }
}
