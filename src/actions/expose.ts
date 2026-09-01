"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { FEATURE } from "@/lib/permissions/feature-access";
import { assertOwnerFeature } from "@/lib/permissions/require-feature";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/security/public-error";
import { assertVehicleOwner } from "@/lib/vehicles/assert-owner";
import {
  exposePublicPath,
  generateExposeToken,
  isValidExposeToken,
} from "@/lib/vehicles/expose-token";

const exposeActionSchema = z
  .object({
    vehicleId: z.string().uuid(),
    tagUuid: z.string().trim().min(1).max(80),
    action: z.enum(["generate", "deactivate", "renew"]),
  })
  .strict();

export type ManageExposeInput = z.infer<typeof exposeActionSchema>;

export type ManageExposeResult =
  | {
      status: "ok";
      exposeToken: string | null;
      isActive: boolean;
      sharePath: string | null;
    }
  | { status: "error"; message: string };

function missingColumnMessage(error: { message: string; code?: string }): string | null {
  const missing =
    error.code === "PGRST204" ||
    error.message.includes("expose_token") ||
    error.message.includes("is_expose_active");
  if (!missing) return null;
  return "Das Verkaufsexposé braucht Migration 00037_vehicle_expose_token.sql in Supabase.";
}

export async function manageVehicleExpose(
  input: ManageExposeInput,
): Promise<ManageExposeResult> {
  try {
    const parsed = exposeActionSchema.safeParse(input);
    if (!parsed.success) {
      return { status: "error", message: "Ungültige Anfrage." };
    }

    const { vehicleId, tagUuid, action } = parsed.data;
    const { isConfigured } = getSupabaseEnv();
    if (!isConfigured) {
      return {
        status: "error",
        message: "Speichern ist lokal ohne Supabase nicht verfügbar.",
      };
    }

    const ownership = await assertVehicleOwner(vehicleId);
    if (!ownership.ok) {
      return {
        status: "error",
        message:
          ownership.reason === "unauthorized"
            ? "Bitte anmelden."
            : ownership.reason === "forbidden"
              ? "Nur der Fahrzeughalter kann das Exposé steuern."
              : ownership.message,
      };
    }
    const pro = await assertOwnerFeature(
      ownership.userId,
      FEATURE.GENERATE_EXPOSE,
    );
    if (!pro.ok) {
      return { status: "error", message: pro.message };
    }

    const supabase = await createClient();
    const { data: current, error: readError } = await supabase
      .from("vehicles")
      .select("expose_token, is_expose_active")
      .eq("id", vehicleId)
      .eq("user_id", ownership.userId)
      .maybeSingle();

    if (readError) {
      return {
        status: "error",
        message: missingColumnMessage(readError) ?? `Laden fehlgeschlagen: ${readError.message}`,
      };
    }

    const existingToken =
      typeof current?.expose_token === "string" &&
      isValidExposeToken(current.expose_token)
        ? current.expose_token
        : null;

    let nextToken = existingToken;
    let nextActive = current?.is_expose_active === true;

    if (action === "deactivate") {
      nextActive = false;
    } else if (action === "renew") {
      nextToken = generateExposeToken();
      nextActive = true;
    } else {
      nextToken = existingToken ?? generateExposeToken();
      nextActive = true;
    }

    const { error } = await supabase
      .from("vehicles")
      .update({
        expose_token: nextToken,
        is_expose_active: nextActive,
      })
      .eq("id", vehicleId)
      .eq("user_id", ownership.userId);

    if (error) {
      logServerError("[expose] update failed", error);
      return {
        status: "error",
        message:
          missingColumnMessage(error) ?? "Speichern fehlgeschlagen.",
      };
    }

    revalidatePath(`/v/${tagUuid}`);
    revalidatePath(`/v/${tagUuid}/einstellungen`);
    if (existingToken) revalidatePath(exposePublicPath(existingToken));
    if (nextToken) revalidatePath(exposePublicPath(nextToken));

    return {
      status: "ok",
      exposeToken: nextToken,
      isActive: nextActive,
      sharePath: nextActive && nextToken ? exposePublicPath(nextToken) : null,
    };
  } catch (error) {
    logServerError("[expose] unexpected", error);
    return {
      status: "error",
      message: "Exposé konnte nicht aktualisiert werden.",
    };
  }
}
