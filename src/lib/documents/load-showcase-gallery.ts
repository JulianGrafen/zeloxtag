import "server-only";

import {
  filterShowcaseGalleryDocuments,
  SHOWCASE_GALLERY_MARKER,
} from "@/lib/documents/showcase-gallery";
import { getMockUploadedDocuments } from "@/lib/documents/mock-uploads";
import { DOCUMENT_SHOWCASE_COLUMNS } from "@/lib/documents/query-columns";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/types/database";

/** Owner settings: showcase gallery photos for a vehicle. */
export async function loadShowcaseGalleryDocuments(
  vehicleId: string,
): Promise<Document[]> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    const uploaded = await getMockUploadedDocuments(vehicleId);
    return filterShowcaseGalleryDocuments(uploaded);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_SHOWCASE_COLUMNS)
    .eq("vehicle_id", vehicleId)
    .eq("invoice_number", SHOWCASE_GALLERY_MARKER)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[load-showcase-gallery] query failed", error);
    return [];
  }

  const documents: Document[] = [];
  for (const row of data ?? []) {
    if (!row || typeof row !== "object") continue;
    const candidate = row as Document;
    if (typeof candidate.id !== "string") continue;
    documents.push(candidate);
  }

  return filterShowcaseGalleryDocuments(documents);
}
