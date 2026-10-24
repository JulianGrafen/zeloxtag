import "server-only";

import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import type { Document } from "@/types/database";

import { upsertServiceRecordFromDocument } from "./upsert-from-document";

export async function syncServiceRecordForDocument(
  document: Document,
): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;

  const admin = createAdminClient();
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("tech_specs")
    .eq("id", document.vehicle_id)
    .maybeSingle();

  const { data: documents } = await admin
    .from("documents")
    .select("*")
    .eq("vehicle_id", document.vehicle_id);

  await upsertServiceRecordFromDocument(document, {
    allDocuments: (documents ?? []) as Document[],
    techSpecs: vehicle?.tech_specs,
  });
}
