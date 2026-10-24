import type {
  ServiceRecordRow as DbServiceRecordRow,
  TablesInsert,
} from "@/types/database";

export const SERVICE_RECORD_CATEGORIES = [
  "oil_change",
  "brakes_front",
  "brakes_rear",
  "spark_plugs",
  "transmission_fluid",
  "brake_fluid",
  "cabin_filter",
  "air_filter",
  "timing_belt",
  "inspection",
  "tuev",
  "custom",
] as const;

export type ServiceRecordCategory = (typeof SERVICE_RECORD_CATEGORIES)[number];

export type ServiceRecordSource = "database" | "legacy_document";

export type ServiceRecord = {
  id: string;
  vehicleId: string;
  category: ServiceRecordCategory;
  title: string;
  date: string;
  mileage: number;
  performedBy: string | null;
  notes: string | null;
  invoiceDocumentId: string | null;
  nextIntervalMileage: number | null;
  nextIntervalDate: string | null;
  showOnPublicShowcase: boolean;
  createdAt: string;
  updatedAt: string;
  source: ServiceRecordSource;
};

export type ServiceRecordRow = DbServiceRecordRow;

export function isServiceRecordCategory(
  value: string,
): value is ServiceRecordCategory {
  return (SERVICE_RECORD_CATEGORIES as readonly string[]).includes(value);
}

export function rowToServiceRecord(row: ServiceRecordRow): ServiceRecord {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    category: row.category as ServiceRecordCategory,
    title: row.title,
    date: row.service_date,
    mileage: row.mileage_km,
    performedBy: row.performed_by,
    notes: row.notes,
    invoiceDocumentId: row.invoice_document_id,
    nextIntervalMileage: row.next_interval_mileage_km,
    nextIntervalDate: row.next_interval_date,
    showOnPublicShowcase: row.show_on_public_showcase,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: "database",
  };
}

export function serviceRecordToInsert(
  record: Pick<
    ServiceRecord,
    | "vehicleId"
    | "category"
    | "title"
    | "date"
    | "mileage"
    | "performedBy"
    | "notes"
    | "invoiceDocumentId"
    | "nextIntervalMileage"
    | "nextIntervalDate"
    | "showOnPublicShowcase"
  >,
): TablesInsert<"service_records"> {
  return {
    vehicle_id: record.vehicleId,
    category: record.category,
    title: record.title,
    service_date: record.date,
    mileage_km: record.mileage,
    performed_by: record.performedBy,
    notes: record.notes,
    invoice_document_id: record.invoiceDocumentId,
    next_interval_mileage_km: record.nextIntervalMileage,
    next_interval_date: record.nextIntervalDate,
    show_on_public_showcase: record.showOnPublicShowcase,
  };
}

export function legacyDocumentRecordId(documentId: string): string {
  return `legacy:document:${documentId}`;
}

export function isLegacyServiceRecordId(id: string): boolean {
  return id.startsWith("legacy:document:");
}
