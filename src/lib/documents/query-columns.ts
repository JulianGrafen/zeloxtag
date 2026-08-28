/**
 * Explicit PostgREST projections — avoid `select *` on hot paths.
 * List payloads omit heavy ABE text blobs (notes / conditions / specs).
 */

export const TAG_COLUMNS =
  "id, uuid, vehicle_id, status, created_at, updated_at" as const;

export const VEHICLE_COLUMNS =
  "id, user_id, make, model, year, vin, tech_specs, silhouette_image_url, is_public, hide_financials, public_slug, created_at, updated_at" as const;

/** Token-gated exposé lookup — never used on the public QR path. */
export const VEHICLE_EXPOSE_COLUMNS =
  "id, make, model, year, tech_specs, silhouette_image_url, is_expose_active, created_at, updated_at" as const;

export const DOCUMENT_LIST_COLUMNS = [
  "id",
  "vehicle_id",
  "user_id",
  "created_by",
  "title",
  "type",
  "file_url",
  "vendor",
  "category",
  "line_items",
  "kba_number",
  "vehicle_approvals",
  "authority",
  "part_category",
  "page_count",
  "manufacturer",
  "invoice_number",
  "mileage_km",
  "approval_fields",
  "amount",
  "date",
  "show_on_public_showcase",
  "created_at",
].join(", ");

/** Invoice / service hot paths — omit ABE-only JSON blobs. */
export const DOCUMENT_INVOICE_LIST_COLUMNS = [
  "id",
  "vehicle_id",
  "user_id",
  "created_by",
  "title",
  "type",
  "file_url",
  "vendor",
  "category",
  "line_items",
  "notes",
  "invoice_number",
  "mileage_km",
  "amount",
  "date",
  "show_on_public_showcase",
  "created_at",
].join(", ");

export const DOCUMENT_DETAIL_COLUMNS = [
  DOCUMENT_LIST_COLUMNS,
  "notes",
  "conditions",
  "technical_specs",
].join(", ");

export const DOCUMENT_SHOWCASE_COLUMNS = [
  "id",
  "vehicle_id",
  "user_id",
  "created_by",
  "title",
  "type",
  "file_url",
  "vendor",
  "category",
  "line_items",
  "invoice_number",
  "mileage_km",
  "amount",
  "date",
  "show_on_public_showcase",
  "created_at",
].join(", ");

/** Public exposé projection — no notes, conditions, invoice files, or IBAN-prone fields. */
export const DOCUMENT_EXPOSE_COLUMNS = [
  "id",
  "vehicle_id",
  "title",
  "type",
  "vendor",
  "category",
  "line_items",
  "part_category",
  "manufacturer",
  "mileage_km",
  "approval_fields",
  "amount",
  "date",
  "created_at",
].join(", ");
