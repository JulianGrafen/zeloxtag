"use server";

import { revalidatePath } from "next/cache";

import { assertVehicleOwner } from "@/lib/vehicles/assert-owner";
import { normalizeVinForStorage } from "@/lib/vehicles/vin";
import {
  parseVehicleTechSpecs,
  serializeVehicleTechSpecs,
  type VehicleTechSpecs,
} from "@/lib/vehicles/tech-specs";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type UpdateVehicleSpecsInput = {
  vehicleId: string;
  tagUuid: string;
  make: string;
  model: string;
  year: string;
  vin?: string;
  techSpecs?: Partial<VehicleTechSpecs> | null;
};

export type UpdateVehicleSpecsResult =
  | { status: "ok" }
  | { status: "error"; message: string };

function normalizeVin(raw: string | undefined): string | null {
  return normalizeVinForStorage(raw);
}

export async function updateVehicleSpecs(
  input: UpdateVehicleSpecsInput,
): Promise<UpdateVehicleSpecsResult> {
  try {
    const make = input.make.trim();
    const model = input.model.trim();
    const year = Number.parseInt(input.year, 10);
    const tagUuid = input.tagUuid.trim();

    if (!input.vehicleId.trim()) {
      return { status: "error", message: "Fahrzeug fehlt." };
    }
    if (!tagUuid) {
      return { status: "error", message: "Tag-UUID fehlt." };
    }
    if (!make) {
      return { status: "error", message: "Marke ist erforderlich." };
    }
    if (!model) {
      return { status: "error", message: "Modell ist erforderlich." };
    }
    if (!Number.isFinite(year) || year < 1900 || year > 2100) {
      return {
        status: "error",
        message: "Baujahr muss zwischen 1900 und 2100 liegen.",
      };
    }

    const vin = normalizeVin(input.vin);
    const techSpecs = serializeVehicleTechSpecs(
      parseVehicleTechSpecs(input.techSpecs ?? null),
    );

    const { isConfigured } = getSupabaseEnv();
    if (!isConfigured) {
      return {
        status: "error",
        message: "Speichern ist lokal ohne Supabase nicht verfügbar.",
      };
    }

    const ownership = await assertVehicleOwner(input.vehicleId);
    if (!ownership.ok) {
      return {
        status: "error",
        message:
          ownership.reason === "unauthorized"
            ? "Bitte anmelden."
            : ownership.reason === "forbidden"
              ? "Nur der Fahrzeughalter kann Stammdaten ändern."
              : ownership.message,
      };
    }

    const supabase = await createClient();
    const basePatch = { make, model, year, vin };
    const { error } = await supabase
      .from("vehicles")
      .update({
        ...basePatch,
        tech_specs: techSpecs,
      })
      .eq("id", ownership.vehicleId)
      .eq("user_id", ownership.userId);

    if (error) {
      const missingColumn =
        error.message.includes("tech_specs") ||
        error.code === "PGRST204" ||
        error.message.toLowerCase().includes("schema cache");

      if (missingColumn) {
        // Stammdaten still save if migration 00024 is not applied yet.
        const { error: fallbackError } = await supabase
          .from("vehicles")
          .update(basePatch)
          .eq("id", ownership.vehicleId)
          .eq("user_id", ownership.userId);

        if (fallbackError) {
          return {
            status: "error",
            message: `Speichern fehlgeschlagen: ${fallbackError.message}`,
          };
        }

        return {
          status: "error",
          message:
            "Stammdaten gespeichert, aber Antrieb/Fahrwerk braucht die Migration 00024_vehicles_tech_specs.sql in Supabase.",
        };
      }

      return {
        status: "error",
        message: `Speichern fehlgeschlagen: ${error.message}`,
      };
    }

    revalidatePath(`/v/${tagUuid}`);
    revalidatePath(`/v/${tagUuid}/daten`);
    return { status: "ok" };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Technische Daten konnten nicht gespeichert werden.",
    };
  }
}
