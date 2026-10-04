import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getVehicleWriteAccess } from "@/lib/auth/vehicle-write-access";
import { loadVehicleRoastContext } from "@/lib/roast/roast-context";
import { generateVehicleBuildRoast, VehicleRoastError } from "@/lib/roast/roast-service";
import { isLlmConfigured } from "@/lib/ocr/llm-client";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireWritableApiUser,
} from "@/lib/security/api-guard";
import { logServerError } from "@/lib/security/public-error";

export const runtime = "nodejs";
export const maxDuration = 45;

const uuidSchema = z.string().uuid();

type RoastErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "config"
  | "rate_limited"
  | "roast_failed";

function jsonError(status: number, error: string, code: RoastErrorCode) {
  return NextResponse.json({ ok: false, error, code }, { status });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(request, "roast", "vehicle");
    if (limited) return limited;

    const auth = await requireWritableApiUser();
    if (!auth.ok) return auth.response;

    if (!isLlmConfigured()) {
      return jsonError(
        503,
        "Roast ist gerade nicht verfügbar.",
        "config",
      );
    }

    const { id: vehicleId } = await context.params;
    if (!uuidSchema.safeParse(vehicleId).success) {
      return jsonError(400, "Ungültige Fahrzeug-ID.", "not_found");
    }

    const access = await getVehicleWriteAccess(vehicleId, auth.user.id);
    if (!access.ok || !access.isOwner || !access.ownerUserId) {
      return jsonError(
        403,
        "Nur der Halter kann den Build roasten lassen.",
        "forbidden",
      );
    }

    const roastContext = await loadVehicleRoastContext(
      vehicleId,
      access.ownerUserId,
    );
    if (!roastContext) {
      return jsonError(404, "Fahrzeug nicht gefunden.", "not_found");
    }

    try {
      const { roast, modelId } = await generateVehicleBuildRoast(roastContext);
      return NextResponse.json({
        ok: true,
        roast,
        modelId,
        vehicleLabel: roastContext.vehicleLabel,
        isStock: roastContext.isStock,
        modCount: roastContext.modifications.length,
      });
    } catch (error) {
      if (error instanceof VehicleRoastError) {
        if (error.code === "config") {
          return jsonError(503, error.message, "config");
        }
        if (error.code === "timeout") {
          return jsonError(504, error.message, "roast_failed");
        }
        return jsonError(422, error.message, "roast_failed");
      }
      throw error;
    }
  } catch (error) {
    logServerError("[vehicles/roast] unexpected", error);
    return jsonError(500, "Roast fehlgeschlagen.", "roast_failed");
  }
}
