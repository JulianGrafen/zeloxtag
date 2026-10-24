import "server-only";

import { rowToServiceRecord } from "./service-record";
import { serviceHistoryFromData } from "./merge-service-history";
import type { Document, Vehicle } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

export async function loadServiceHistoryForVehicle(
  vehicleId: string,
  documents: Document[],
  techSpecs?: Vehicle["tech_specs"],
): Promise<ServiceRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_records")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("service_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return serviceHistoryFromData({
      vehicleId,
      documents,
      databaseRows: [],
      techSpecs,
    });
  }

  const databaseRows = (data ?? []).map((row) =>
    rowToServiceRecord(row as import("@/types/database").ServiceRecordRow),
  );

  return serviceHistoryFromData({
    vehicleId,
    documents,
    databaseRows,
    techSpecs,
  });
}
