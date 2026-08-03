import { parseLineItems } from "@/lib/documents/line-items";
import { getMockUploadedDocuments } from "@/lib/documents/mock-uploads";
import {
  parseAbeConditions,
  parseStringList,
} from "@/lib/documents/string-list";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
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
  return {
    ...doc,
    vendor: typeof doc.vendor === "string" ? doc.vendor : null,
    category: typeof doc.category === "string" ? doc.category : null,
    line_items: parseLineItems(doc.line_items),
    kba_number: typeof doc.kba_number === "string" ? doc.kba_number : null,
    vehicle_approvals: parseStringList(doc.vehicle_approvals, {
      maxItemLength: 160,
      maxItems: 40,
    }),
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
    mileage_km: typeof doc.mileage_km === "number" ? doc.mileage_km : null,
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
 * Resolves a physical ZeloxTag QR UUID to tag + optional vehicle payload.
 *
 * Production path uses `resolve_tag_by_uuid` (SECURITY DEFINER) so anonymous
 * scanners can load an active digital twin without opening vehicles/documents
 * RLS to the world.
 *
 * Falls back to mock data when Supabase env is not configured, or for known
 * local demo UUIDs missing from the remote project.
 */
export async function getTagByUuid(uuid: string): Promise<TagScanResult | null> {
  const normalized = uuid.trim();
  if (!normalized) return null;

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return resolveMockTag(normalized);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_tag_by_uuid", {
    p_uuid: normalized,
  });

  if (error) {
    // Keep local demo tags usable if the project RPC/schema is incomplete.
    if (isDemoTagUuid(normalized)) {
      return resolveMockTag(normalized);
    }
    throw new Error(`Failed to resolve tag: ${error.message}`);
  }

  if (data === null || data === undefined) {
    if (isDemoTagUuid(normalized)) {
      return resolveMockTag(normalized);
    }
    return null;
  }

  if (!isTagScanResult(data)) {
    throw new Error("Tag resolver returned an unexpected payload shape.");
  }

  return {
    tag: data.tag as Tag,
    vehicle: (data.vehicle as Vehicle | null) ?? null,
    documents: ((data.documents as unknown[]) ?? [])
      .map(normalizeDocument)
      .filter((doc): doc is Document => doc !== null),
  };
}
