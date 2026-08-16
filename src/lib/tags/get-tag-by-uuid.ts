import { cache } from "react";

import { parseApprovalFields } from "@/lib/documents/approval-fields";
import {
  DOCUMENT_DETAIL_COLUMNS,
  DOCUMENT_LIST_COLUMNS,
  TAG_COLUMNS,
  VEHICLE_COLUMNS,
} from "@/lib/documents/query-columns";
import { parseLineItems } from "@/lib/documents/line-items";
import { getMockUploadedDocuments } from "@/lib/documents/mock-uploads";
import {
  parseAbeConditions,
  parseStringList,
} from "@/lib/documents/string-list";
import { parseTechnicalSpecs } from "@/lib/documents/technical-specs";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { withDefaultShowcaseFields } from "@/lib/vehicles/public-showcase-data";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { Document, Tag, TagScanResult, Vehicle } from "@/types/database";

import { getMockTagScan, MOCK_TAG_UUIDS } from "./mock-tags";

function isTagScanResult(value: unknown): value is TagScanResult {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (!record.tag || typeof record.tag !== "object") return false;
  if (!Array.isArray(record.documents)) return false;
  return true;
}

function normalizeDocument(value: unknown): Document | null {
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

  return {
    ...doc,
    user_id: typeof doc.user_id === "string" ? doc.user_id : "",
    created_by: typeof doc.created_by === "string" ? doc.created_by : null,
    vendor: typeof doc.vendor === "string" ? doc.vendor : null,
    category: typeof doc.category === "string" ? doc.category : null,
    line_items: parseLineItems(doc.line_items),
    kba_number: typeof doc.kba_number === "string" ? doc.kba_number : null,
    vehicle_approvals: parseStringList(doc.vehicle_approvals),
    authority: typeof doc.authority === "string" ? doc.authority : null,
    conditions: parseAbeConditions(doc.conditions),
    part_category:
      typeof doc.part_category === "string" ? doc.part_category : null,
    notes: typeof doc.notes === "string" ? doc.notes : null,
    page_count: typeof doc.page_count === "number" ? doc.page_count : null,
    manufacturer:
      typeof doc.manufacturer === "string" ? doc.manufacturer : null,
    invoice_number:
      typeof doc.invoice_number === "string" ? doc.invoice_number : null,
    amount: Number.isFinite(amount) ? amount : null,
    mileage_km: Number.isFinite(mileageKm) ? mileageKm : null,
    technical_specs: parseTechnicalSpecs(doc.technical_specs),
    approval_fields: parseApprovalFields(doc.approval_fields),
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

function normalizeScanResult(data: TagScanResult): TagScanResult {
  return {
    tag: data.tag as Tag,
    vehicle: normalizeVehicle(data.vehicle),
    documents: ((data.documents as unknown[]) ?? [])
      .map(normalizeDocument)
      .filter((doc): doc is Document => doc !== null),
  };
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

/**
 * Direct service-role lookup. Required when FORCE RLS is on and migration
 * 00013 (`row_security = off` on the RPC) is not yet applied — SECURITY DEFINER
 * alone cannot see vehicles/documents, which made post-claim redirects 404.
 */
async function resolveTagWithAdmin(
  uuid: string,
): Promise<TagScanResult | null> {
  const supabase = createAdminClient();

  const { data: tag, error: tagError } = await supabase
    .from("tags")
    .select(TAG_COLUMNS)
    .eq("uuid", uuid)
    .maybeSingle();

  if (tagError) {
    throw new Error(`Failed to resolve tag: ${tagError.message}`);
  }
  if (!tag) return null;

  if (tag.status === "active" && tag.vehicle_id) {
    const [{ data: vehicle, error: vehicleError }, { data: documents, error: docsError }] =
      await Promise.all([
        supabase
          .from("vehicles")
          .select(VEHICLE_COLUMNS)
          .eq("id", tag.vehicle_id)
          .maybeSingle(),
        supabase
          .from("documents")
          .select(DOCUMENT_LIST_COLUMNS)
          .eq("vehicle_id", tag.vehicle_id)
          .order("created_at", { ascending: false }),
      ]);

    if (vehicleError) {
      throw new Error(`Failed to resolve vehicle: ${vehicleError.message}`);
    }
    if (docsError) {
      throw new Error(`Failed to resolve documents: ${docsError.message}`);
    }

    return normalizeScanResult({
      tag: tag as Tag,
      vehicle: (vehicle as Vehicle | null) ?? null,
      documents: Array.isArray(documents)
        ? (documents as unknown as Document[])
        : [],
    });
  }

  return normalizeScanResult({
    tag: tag as Tag,
    vehicle: null,
    documents: [],
  });
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
 * Resolves a physical ZeloxTag QR UUID to tag + optional vehicle payload.
 *
 * Prefers the service-role path (full twin for server-side owner checks).
 * The public RPC (`resolve_tag_by_uuid`) is redacted — no documents/VIN/owner id —
 * and is only a fallback. Never hydrate RPC/admin payloads into the client for
 * non-owners; use `toGuestClientTagScanResult` / `PrivateTwinGate` instead.
 */
async function getTagByUuidUncached(
  uuid: string,
): Promise<TagScanResult | null> {
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

  if (isSupabaseAdminConfigured()) {
    const viaAdmin = await resolveTagWithAdmin(normalized);
    if (viaAdmin) return viaAdmin;
    return null;
  }

  return resolveTagWithRpc(normalized);
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

  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const supabase = createAdminClient();
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
