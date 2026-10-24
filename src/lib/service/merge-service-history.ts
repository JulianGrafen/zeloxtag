import { legacyServiceRecordsFromDocuments, mergeServiceHistory } from "./legacy-from-documents";
import { rowToServiceRecord, type ServiceRecord } from "./service-record";
import type { Document, ServiceRecordRow, Vehicle } from "@/types/database";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";

export function serviceHistoryFromData(input: {
  vehicleId: string;
  documents: Document[];
  databaseRows: ServiceRecordRow[] | ServiceRecord[];
  techSpecs?: Vehicle["tech_specs"];
}): ServiceRecord[] {
  const databaseRecords = input.databaseRows.map((row) =>
    "vehicleId" in row ? row : rowToServiceRecord(row),
  );
  const linked = new Set(
    databaseRecords
      .map((r) => r.invoiceDocumentId)
      .filter((id): id is string => Boolean(id)),
  );
  const legacy = legacyServiceRecordsFromDocuments(
    input.documents,
    parseVehicleTechSpecs(input.techSpecs),
    linked,
  );
  return mergeServiceHistory(databaseRecords, legacy);
}
