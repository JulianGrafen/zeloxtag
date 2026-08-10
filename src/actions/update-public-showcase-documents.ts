"use server";

import { revalidatePath } from "next/cache";

import { assertVehicleOwner } from "@/lib/vehicles/assert-owner";
import { publicShowcasePath } from "@/lib/vehicles/public-slug";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type UpdatePublicShowcaseDocumentsInput = {
  vehicleId: string;
  tagUuid: string;
  documentIds: string[];
};

export type UpdatePublicShowcaseDocumentsResult =
  | { status: "ok" }
  | { status: "error"; message: string };

export async function updatePublicShowcaseDocuments(
  input: UpdatePublicShowcaseDocumentsInput,
): Promise<UpdatePublicShowcaseDocumentsResult> {
  try {
    const vehicleId = input.vehicleId.trim();
    const tagUuid = input.tagUuid.trim();
    const selected = new Set(
      input.documentIds.map((id) => id.trim()).filter(Boolean),
    );

    if (!vehicleId || !tagUuid) {
      return { status: "error", message: "Fahrzeug oder Tag fehlt." };
    }

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
              ? "Nur der Fahrzeughalter kann Einstellungen ändern."
              : ownership.message,
      };
    }

    const supabase = await createClient();

    const { data: vehicleRow, error: vehicleError } = await supabase
      .from("vehicles")
      .select("public_slug")
      .eq("id", vehicleId)
      .eq("user_id", ownership.userId)
      .maybeSingle();

    if (vehicleError) {
      return {
        status: "error",
        message: `Laden fehlgeschlagen: ${vehicleError.message}`,
      };
    }

    const { data: docs, error: docsError } = await supabase
      .from("documents")
      .select("id")
      .eq("vehicle_id", vehicleId);

    if (docsError) {
      const missingColumn =
        docsError.message.includes("show_on_public_showcase") ||
        docsError.code === "PGRST204";

      if (missingColumn) {
        return {
          status: "error",
          message:
            "Dokument-Auswahl braucht Migration 00031_document_public_showcase.sql in Supabase.",
        };
      }

      return {
        status: "error",
        message: `Dokumente konnten nicht geladen werden: ${docsError.message}`,
      };
    }

    const docIds = (docs ?? []).map((row) => row.id as string);
    const toEnable = docIds.filter((id) => selected.has(id));
    const toDisable = docIds.filter((id) => !selected.has(id));

    if (toDisable.length > 0) {
      const { error } = await supabase
        .from("documents")
        .update({ show_on_public_showcase: false })
        .eq("vehicle_id", vehicleId)
        .in("id", toDisable);

      if (error) {
        return {
          status: "error",
          message: `Speichern fehlgeschlagen: ${error.message}`,
        };
      }
    }

    if (toEnable.length > 0) {
      const { error } = await supabase
        .from("documents")
        .update({ show_on_public_showcase: true })
        .eq("vehicle_id", vehicleId)
        .in("id", toEnable);

      if (error) {
        return {
          status: "error",
          message: `Speichern fehlgeschlagen: ${error.message}`,
        };
      }
    }

    revalidatePath(`/v/${tagUuid}`);
    revalidatePath(`/v/${tagUuid}/daten`);
    revalidatePath(`/v/${tagUuid}/einstellungen`);

    const publicSlug =
      typeof vehicleRow?.public_slug === "string" ? vehicleRow.public_slug : null;
    if (publicSlug) {
      revalidatePath(publicShowcasePath(publicSlug));
    }

    return { status: "ok" };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Showcase-Dokumente konnten nicht gespeichert werden.",
    };
  }
}
