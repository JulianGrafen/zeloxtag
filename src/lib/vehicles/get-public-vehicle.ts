import "server-only";

import { cache } from "react";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { withDefaultShowcaseFields } from "@/lib/vehicles/public-showcase-data";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { Document, TagScanResult, Vehicle } from "@/types/database";

import { parseLineItems } from "@/lib/documents/line-items";
import { DOCUMENT_SHOWCASE_COLUMNS, VEHICLE_COLUMNS } from "@/lib/documents/query-columns";
import { getTagByUuid } from "@/lib/tags/get-tag-by-uuid";

function isMissingShowcaseColumnError(error: {
  message?: string;
  code?: string;
}): boolean {
  return Boolean(error.message?.includes("show_on_public_showcase"));
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

async function loadVehicleDocuments(vehicleId: string): Promise<Document[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("documents")
    .select(DOCUMENT_SHOWCASE_COLUMNS)
    .eq("vehicle_id", vehicleId)
    .eq("show_on_public_showcase", true)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingShowcaseColumnError(error)) {
      console.warn(
        "[public-showcase] documents.show_on_public_showcase missing — apply migration 00031_document_public_showcase.sql",
      );
      return [];
    }
    throw new Error(`Failed to load public showcase documents: ${error.message}`);
  }

  return (Array.isArray(data) ? data : []).map((row) => {
    const doc = row as Document;
    return {
      ...doc,
      line_items: parseLineItems(doc.line_items),
      // Query already scoped to opted-in rows — keep the flag explicit for extract.
      show_on_public_showcase: true,
    };
  });
}

async function loadVehicleBySlugRpc(slug: string): Promise<Vehicle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_public_vehicle_by_slug", {
    p_slug: slug.trim(),
  });

  if (error) {
    throw new Error(`Failed to resolve public slug: ${error.message}`);
  }
  if (!data || typeof data !== "object") return null;
  const record = data as { vehicle?: unknown };
  return normalizeVehicle(record.vehicle);
}

async function loadVehicleBySlugAdmin(slug: string): Promise<Vehicle | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicles")
    .select(VEHICLE_COLUMNS)
    .eq("public_slug", slug.trim())
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve public slug: ${error.message}`);
  }
  return data ? normalizeVehicle(data) : null;
}

export type PublicVehicleLookup =
  | { kind: "tag"; result: TagScanResult }
  | { kind: "slug"; vehicle: Vehicle };

/**
 * Resolve `/v/{identifier}` — physical tag UUID or vehicles.public_slug.
 */
async function resolvePublicVehicleEntryUncached(
  identifier: string,
): Promise<PublicVehicleLookup | null> {
  const normalized = identifier.trim();
  if (!normalized) return null;

  const tagResult = await getTagByUuid(normalized);
  if (tagResult) {
    return { kind: "tag", result: tagResult };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return null;

  const vehicle =
    (await loadVehicleBySlugAdmin(normalized)) ??
    (await loadVehicleBySlugRpc(normalized));

  if (!vehicle) return null;
  return { kind: "slug", vehicle };
}

/** Request-memoized — generateMetadata and the page share one lookup. */
export const resolvePublicVehicleEntry = cache(resolvePublicVehicleEntryUncached);

export async function loadPublicShowcaseDocuments(
  vehicleId: string,
): Promise<Document[]> {
  return loadVehicleDocuments(vehicleId);
}

export async function isVehiclePublicShowcase(
  vehicleId: string,
): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return false;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicles")
    .select("is_public")
    .eq("id", vehicleId)
    .maybeSingle();

  if (error || !data) return false;
  return Boolean(data.is_public);
}
