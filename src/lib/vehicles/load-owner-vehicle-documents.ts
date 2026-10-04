import "server-only";

import { parseLineItems } from "@/lib/documents/line-items";
import { DOCUMENT_LIST_COLUMNS } from "@/lib/documents/query-columns";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/types/database";

export async function loadOwnerVehicleDocuments(
  vehicleId: string,
  ownerUserId: string,
): Promise<Document[]> {
  const client = isSupabaseAdminConfigured()
    ? createAdminClient()
    : await createClient();

  const { data, error } = await client
    .from("documents")
    .select(DOCUMENT_LIST_COLUMNS)
    .eq("vehicle_id", vehicleId)
    .eq("user_id", ownerUserId)
    .order("date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[vehicles] load owner documents failed", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const doc = row as unknown as Document;
    return {
      ...doc,
      line_items: parseLineItems(doc.line_items),
    };
  });
}
