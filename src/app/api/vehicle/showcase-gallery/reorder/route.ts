import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { DOCUMENT_SHOWCASE_COLUMNS } from "@/lib/documents/query-columns";
import {
  filterShowcaseGalleryDocuments,
  SHOWCASE_GALLERY_MARKER,
} from "@/lib/documents/showcase-gallery";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireWritableApiUser,
} from "@/lib/security/api-guard";
import { logServerError } from "@/lib/security/public-error";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Document } from "@/types/database";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    vehicleId: z.string().uuid(),
    tagUuid: z.string().trim().min(1).max(128).optional(),
    orderedDocumentIds: z.array(z.string().uuid()).min(1).max(10),
  })
  .strict();

function jsonError(status: number, error: string, code: string) {
  return NextResponse.json({ ok: false as const, error, code }, { status });
}

function revalidateShowcasePaths(tagUuid: string | undefined, publicSlug: string | null) {
  if (tagUuid?.trim()) {
    revalidatePath(`/v/${tagUuid.trim()}`);
    revalidatePath(`/v/${tagUuid.trim()}/einstellungen`);
    revalidatePath(`/v/${tagUuid.trim()}/einstellungen/galerie`);
  }
  const slug = publicSlug?.trim();
  if (slug) {
    revalidatePath(`/v/${slug}`, "page");
  }
}

/**
 * PATCH /api/vehicle/showcase-gallery/reorder
 * Persists drag-and-drop order (1-based `amount` on gallery documents).
 */
export async function PATCH(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(
      request,
      "apiDefault",
      "vehicle-showcase-gallery-reorder",
    );
    if (limited) return limited;

    const { isConfigured } = getSupabaseEnv();
    if (!isConfigured) {
      return jsonError(503, "Supabase ist nicht konfiguriert.", "config");
    }

    const auth = await requireWritableApiUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return jsonError(400, "Ungültige Anfrage.", "bad_request");
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return jsonError(400, "Ungültige Reihenfolge.", "validation");
    }

    const { vehicleId, tagUuid, orderedDocumentIds } = parsed.data;
    const supabase = await createClient();

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, user_id, public_slug")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError || !vehicle) {
      return jsonError(404, "Fahrzeug nicht gefunden.", "not_found");
    }
    if (vehicle.user_id !== user.id) {
      return jsonError(403, "Nicht berechtigt.", "forbidden");
    }

    const { data: rows, error: docsError } = await supabase
      .from("documents")
      .select(DOCUMENT_SHOWCASE_COLUMNS)
      .eq("vehicle_id", vehicleId)
      .eq("invoice_number", SHOWCASE_GALLERY_MARKER);

    if (docsError) {
      logServerError("[vehicle-showcase-gallery/reorder] load failed", docsError);
      return jsonError(500, "Reihenfolge konnte nicht geladen werden.", "db_error");
    }

    const documents: Document[] = [];
    for (const row of rows ?? []) {
      if (!row || typeof row !== "object") continue;
      const candidate = row as Document;
      if (typeof candidate.id !== "string") continue;
      documents.push(candidate);
    }
    const gallery = filterShowcaseGalleryDocuments(documents);
    if (gallery.length === 0) {
      return jsonError(400, "Keine Galerie-Fotos vorhanden.", "empty");
    }

    const galleryIds = new Set(gallery.map((doc) => doc.id));
    const uniqueOrdered = [...new Set(orderedDocumentIds)];
    if (uniqueOrdered.length !== gallery.length) {
      return jsonError(400, "Reihenfolge ist unvollständig.", "validation");
    }
    for (const id of uniqueOrdered) {
      if (!galleryIds.has(id)) {
        return jsonError(400, "Ungültiges Galerie-Foto.", "validation");
      }
    }

    for (let index = 0; index < uniqueOrdered.length; index += 1) {
      const documentId = uniqueOrdered[index];
      const sortAmount = index + 1;
      const { error } = await supabase
        .from("documents")
        .update({ amount: sortAmount })
        .eq("id", documentId)
        .eq("vehicle_id", vehicleId);

      if (error) {
        logServerError("[vehicle-showcase-gallery/reorder] update failed", {
          documentId,
          error,
        });
        return jsonError(500, "Reihenfolge konnte nicht gespeichert werden.", "db_error");
      }
    }

    revalidateShowcasePaths(tagUuid, vehicle.public_slug ?? null);
    return NextResponse.json({ ok: true as const });
  } catch (error) {
    logServerError("[vehicle-showcase-gallery/reorder] PATCH failed", error);
    return jsonError(500, "Reihenfolge konnte nicht gespeichert werden.", "internal_error");
  }
}
