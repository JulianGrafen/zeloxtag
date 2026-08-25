"use server";

import { revalidatePath } from "next/cache";

import { parseLineItems } from "@/lib/documents/line-items";
import { assertVehicleOwner } from "@/lib/vehicles/assert-owner";
import {
  listShowcaseLineItemOptions,
  parseShowcaseLineSelections,
  withShowcaseLineSelection,
} from "@/lib/vehicles/public-showcase-line-items";
import { publicShowcasePath } from "@/lib/vehicles/public-slug";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type UpdatePublicShowcaseDocumentsInput = {
  vehicleId: string;
  tagUuid: string;
  documentIds: string[];
  /** Selected line-item indexes per document (public Umbau positions). */
  lineSelections?: Record<string, number[]>;
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
    const lineSelections = parseShowcaseLineSelections(input.lineSelections);

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

    if (!isSupabaseAdminConfigured()) {
      return {
        status: "error",
        message: "SUPABASE_SERVICE_ROLE_KEY fehlt.",
      };
    }

    const supabase = await createClient();
    const admin = createAdminClient();

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

    const { data: docs, error: docsError } = await admin
      .from("documents")
      .select("id, line_items")
      .eq("vehicle_id", vehicleId);

    if (docsError) {
      return {
        status: "error",
        message: `Dokumente konnten nicht geladen werden: ${docsError.message}`,
      };
    }

    const docIds = (docs ?? []).map((row) => row.id as string);
    const toEnable = docIds.filter((id) => selected.has(id));
    const toDisable = docIds.filter((id) => !selected.has(id));

    if (toDisable.length > 0) {
      const { error } = await admin
        .from("documents")
        .update({ show_on_public_showcase: false })
        .eq("vehicle_id", vehicleId)
        .in("id", toDisable);

      if (error) {
        const missingColumn = error.message.includes("show_on_public_showcase");
        return {
          status: "error",
          message: missingColumn
            ? "Dokument-Auswahl braucht Migration 00031_document_public_showcase.sql in Supabase."
            : `Speichern fehlgeschlagen: ${error.message}`,
        };
      }
    }

    if (toEnable.length > 0) {
      const { error } = await admin
        .from("documents")
        .update({ show_on_public_showcase: true })
        .eq("vehicle_id", vehicleId)
        .in("id", toEnable);

      if (error) {
        const missingColumn = error.message.includes("show_on_public_showcase");
        return {
          status: "error",
          message: missingColumn
            ? "Dokument-Auswahl braucht Migration 00031_document_public_showcase.sql in Supabase."
            : `Speichern fehlgeschlagen: ${error.message}`,
        };
      }
    }

    for (const row of docs ?? []) {
      const documentId = row.id as string;
      if (!selected.has(documentId)) continue;
      if (!Object.prototype.hasOwnProperty.call(lineSelections, documentId)) {
        continue;
      }

      const currentItems = parseLineItems(row.line_items);
      if (!currentItems?.length) continue;

      const eligibleIndexes = listShowcaseLineItemOptions(currentItems).map(
        (item) => item.index,
      );
      const requestedIndexes = lineSelections[documentId] ?? eligibleIndexes;
      const selectedIndexes =
        requestedIndexes.length > 0 ? requestedIndexes : eligibleIndexes;

      const nextItems = withShowcaseLineSelection(
        currentItems,
        new Set(selectedIndexes),
      );
      const { error } = await admin
        .from("documents")
        .update({ line_items: nextItems })
        .eq("vehicle_id", vehicleId)
        .eq("id", documentId);

      if (error) {
        return {
          status: "error",
          message: `Positionen konnten nicht gespeichert werden: ${error.message}`,
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
