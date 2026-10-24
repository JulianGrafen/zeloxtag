import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ServiceRecordRow } from "@/types/database";

export async function loadPublicServiceRecords(
  vehicleId: string,
): Promise<ServiceRecordRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_records")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .eq("show_on_public_showcase", true)
    .order("service_date", { ascending: false });

  if (error) return [];
  return (data ?? []) as ServiceRecordRow[];
}
