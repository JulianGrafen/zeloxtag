import { cache } from "react";
import { unstable_noStore as noStore } from "next/cache";

import { parseApprovalFields } from "@/lib/documents/approval-fields";
import { getCurrentUser } from "@/lib/auth/get-user";
import {
  DOCUMENT_ABE_LIST_COLUMNS,
  DOCUMENT_DETAIL_COLUMNS,
  DOCUMENT_INVOICE_LIST_COLUMNS,
  DOCUMENT_LIST_COLUMNS,
  DOCUMENT_SHOWCASE_COLUMNS,
  VEHICLE_COLUMNS,
} from "@/lib/documents/query-columns";
import { parseLineItems } from "@/lib/documents/line-items";
import { getMockUploadedDocuments } from "@/lib/documents/mock-uploads";
import {
  parseAbeConditions,
  parseStringList,
} from "@/lib/documents/string-list";
import { parseTechnicalSpecs } from "@/lib/documents/technical-specs";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { withDefaultShowcaseFields } from "@/lib/vehicles/public-showcase-data";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { Document, DocumentType, Tag, TagScanResult, Vehicle } from "@/types/database";

import { getMockTagScan, MOCK_TAG_UUIDS } from "./mock-tags";

function isTagScanResult(value: unknown): value is TagScanResult {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (!record.tag || typeof record.tag !== "object") return false;
  if (!Array.isArray(record.documents)) return false;
  return true;
}

function normalizeDocument(
  value: unknown,
  options?: { light?: boolean },
): Document | null {
  if (!value || typeof value !== "object") return null;
  const doc = value as Document;
  if (typeof doc.id !== "string" || typeof doc.title !== "string") return null;
  const amountRaw = (doc as { amount?: unknown }).amount;
  const amount =
    typeof amountRaw === "number" && Number.isFinite(amountRaw)
      ? amountRaw
      : typeof amountRaw === "string"
        ? Number.parseFloat(amountRaw.replace(",", "."))
        : NaN;
  const mileageRaw = (doc as { mileage_km?: unknown }).mileage_km;
  const mileageKm =
    typeof mileageRaw === "number" && Number.isFinite(mileageRaw)
      ? Math.round(mileageRaw)
      : typeof mileageRaw === "string"
        ? Number.parseInt(mileageRaw.replace(/[^\d]/g, ""), 10)
        : NaN;

  const docType = doc.type;
  const parseAbeFields =
    !options?.light && (docType === "abe" || docType === "tuev");

  return {
    ...doc,
    user_id: typeof doc.user_id === "string" ? doc.user_id : "",
    created_by: typeof doc.created_by === "string" ? doc.created_by : null,
    vendor: typeof doc.vendor === "string" ? doc.vendor : null,
    category: typeof doc.category === "string" ? doc.category : null,
    line_items: parseLineItems(doc.line_items),
    kba_number:
      parseAbeFields && typeof doc.kba_number === "string"
        ? doc.kba_number
        : null,
    vehicle_approvals: parseAbeFields
      ? parseStringList(doc.vehicle_approvals)
      : [],
    authority:
      parseAbeFields && typeof doc.authority === "string"
        ? doc.authority
        : null,
    conditions: parseAbeFields ? parseAbeConditions(doc.conditions) : null,
    part_category:
      parseAbeFields && typeof doc.part_category === "string"
        ? doc.part_category
        : null,
    notes: typeof doc.notes === "string" ? doc.notes : null,
    page_count:
      parseAbeFields && typeof doc.page_count === "number"
        ? doc.page_count
        : null,
    manufacturer:
      parseAbeFields && typeof doc.manufacturer === "string"
        ? doc.manufacturer
        : null,
    invoice_number:
      typeof doc.invoice_number === "string" ? doc.invoice_number : null,
    amount: Number.isFinite(amount) ? amount : null,
    mileage_km: Number.isFinite(mileageKm) ? mileageKm : null,
    technical_specs: parseAbeFields
      ? parseTechnicalSpecs(doc.technical_specs)
      : null,
    approval_fields: parseAbeFields
      ? parseApprovalFields(doc.approval_fields)
      : null,
    show_on_public_showcase: doc.show_on_public_showcase === true,
  };
}

function normalizeVehicle(value: unknown): Vehicle | null {
  if (!value || typeof value !== "object") return null;
  const vehicle = value as Vehicle;
  if (typeof vehicle.id !== "string" || typeof vehicle.make !== "string") {
    return null;
  }
  return withDefaultShowcaseFields({
    ...vehicle,
    user_id: typeof vehicle.user_id === "string" ? vehicle.user_id : "",
    model: typeof vehicle.model === "string" ? vehicle.model : "",
    year: typeof vehicle.year === "number" ? vehicle.year : null,
    vin: typeof vehicle.vin === "string" ? vehicle.vin : null,
    tech_specs: parseVehicleTechSpecs(vehicle.tech_specs),
    silhouette_image_url:
      typeof vehicle.silhouette_image_url === "string"
        ? vehicle.silhouette_image_url
        : null,
    created_at:
      typeof vehicle.created_at === "string" ? vehicle.created_at : "",
    updated_at:
      typeof vehicle.updated_at === "string" ? vehicle.updated_at : "",
  });
}

function normalizeScanResult(
  data: TagScanResult,
  options?: { lightDocuments?: boolean },
): TagScanResult {
  const light = options?.lightDocuments ?? false;
  return {
    tag: data.tag as Tag,
    vehicle: normalizeVehicle(data.vehicle),
    documents: ((data.documents as unknown[]) ?? [])
      .map((doc) => normalizeDocument(doc, { light }))
      .filter((doc): doc is Document => doc !== null),
  };
}

export type DocumentListColumnProfile =
  | "list"
  | "invoice"
  | "showcase"
  | "abe";

export type TagDocumentLoad =
  | { mode: "all"; columns?: DocumentListColumnProfile }
  | { mode: "none" }
  | {
      mode: "types";
      types: DocumentType[];
      columns?: DocumentListColumnProfile;
    };

export type TagLoadOptions = {
  documents?: TagDocumentLoad;
};

function documentSelectColumns(load?: TagDocumentLoad): string {
  const columns =
    load?.mode === "types"
      ? load.columns
      : load?.mode === "all"
        ? load.columns
        : undefined;
  if (columns === "invoice") return DOCUMENT_INVOICE_LIST_COLUMNS;
  if (columns === "showcase") return DOCUMENT_SHOWCASE_COLUMNS;
  if (columns === "abe") return DOCUMENT_ABE_LIST_COLUMNS;
  return DOCUMENT_LIST_COLUMNS;
}

function usesLightDocumentNormalize(load?: TagDocumentLoad): boolean {
  if (!load || load.mode === "none") return true;
  if (load.mode === "types") {
    return load.types.every(
      (type) => type === "invoice" || type === "other",
    );
  }
  return load.columns === "invoice" || load.columns === "showcase";
}

async function resolveMockTag(uuid: string): Promise<TagScanResult | null> {
  const mock = getMockTagScan(uuid);
  if (!mock) return null;
  if (!mock.vehicle) return mock;

  const uploaded = await getMockUploadedDocuments(mock.vehicle.id);
  return {
    ...mock,
    documents: [...uploaded, ...mock.documents],
  };
}

function isDemoTagUuid(uuid: string): boolean {
  return (
    uuid === MOCK_TAG_UUIDS.active || uuid === MOCK_TAG_UUIDS.unclaimed
  );
}

async function resolveTagWithRpc(
  uuid: string,
): Promise<TagScanResult | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_tag_by_uuid", {
    p_uuid: uuid,
  });

  if (error) {
    throw new Error(`Failed to resolve tag: ${error.message}`);
  }
  if (data === null || data === undefined) {
    return null;
  }
  if (!isTagScanResult(data)) {
    throw new Error("Tag resolver returned an unexpected payload shape.");
  }
  return normalizeScanResult(data);
}

/**
 * Overlay owner/contributor fields via session RLS. Guests keep the redacted
 * RPC payload (no extra queries that could distinguish unclaimed inventory).
 */
async function hydratePrivateTwin(
  scan: TagScanResult,
  documentLoad: TagDocumentLoad,
): Promise<TagScanResult> {
  const vehicleId = scan.vehicle?.id?.trim();
  if (!vehicleId) return scan;

  const supabase = await createClient();
  const lightDocuments = usesLightDocumentNormalize(documentLoad);

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select(VEHICLE_COLUMNS)
    .eq("id", vehicleId)
    .maybeSingle();

  if (vehicleError) {
    throw new Error(`Failed to resolve vehicle: ${vehicleError.message}`);
  }
  if (!vehicle) {
    return scan;
  }

  let documents: unknown[] = [];
  if (documentLoad.mode !== "none") {
    let docQuery = supabase
      .from("documents")
      .select(documentSelectColumns(documentLoad))
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false });

    if (documentLoad.mode === "types" && documentLoad.types.length > 0) {
      docQuery = docQuery.in("type", documentLoad.types);
    }

    const { data: docs, error: docsError } = await docQuery;
    if (docsError) {
      throw new Error(`Failed to resolve documents: ${docsError.message}`);
    }
    documents = Array.isArray(docs) ? docs : [];
  }

  return normalizeScanResult(
    {
      tag: {
        ...scan.tag,
        vehicle_id: vehicle.id,
      },
      vehicle: vehicle as Vehicle,
      documents: documents as Document[],
    },
    { lightDocuments },
  );
}

/**
 * Resolves a physical ZeloxTag QR UUID to tag + optional vehicle payload.
 *
 * Public scans use only `resolve_tag_by_uuid` (anon SSR client). The RPC
 * returns an active twin or null — unclaimed and unknown UUIDs are identical.
 * Signed-in owners/contributors then overlay private fields via table RLS.
 */
async function getTagByUuidUncached(
  uuid: string,
  options?: TagLoadOptions,
): Promise<TagScanResult | null> {
  noStore();
  const normalized = uuid.trim();
  if (!normalized) return null;

  // Showcase UUIDs always use the in-repo mock twin (Toyota Supra A80) so
  // /v/demo-active-tag stays consistent even when the same uuid exists in prod DB.
  if (isDemoTagUuid(normalized)) {
    return resolveMockTag(normalized);
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return resolveMockTag(normalized);
  }

  const viaRpc = await resolveTagWithRpc(normalized);
  if (!viaRpc) return null;

  const viewer = await getCurrentUser();
  if (!viewer) return viaRpc;

  return hydratePrivateTwin(
    viaRpc,
    options?.documents ?? { mode: "all", columns: "list" },
  );
}

/** Request-memoized QR lookup — metadata + page + access share one twin load. */
export const getTagByUuid = cache(getTagByUuidUncached);

/** Full document row for detail views (list payload omits notes/conditions/specs). */
export async function getDocumentById(
  vehicleId: string,
  documentId: string,
): Promise<Document | null> {
  const vid = vehicleId.trim();
  const did = documentId.trim();
  if (!vid || !did) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_DETAIL_COLUMNS)
    .eq("id", did)
    .eq("vehicle_id", vid)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load document: ${error.message}`);
  }
  return data ? normalizeDocument(data) : null;
}
