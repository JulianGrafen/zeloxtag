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
import {
  DOCUMENT_SHOWCASE_COLUMNS,
  VEHICLE_BUILD_DNA_COLUMNS,
} from "@/lib/documents/query-columns";
import {
  isMissingVehicleBuildDnaColumnError,
  loadVehicleProjectionMaybeSingle,
} from "@/lib/vehicles/load-vehicle-projection";
import { publicScanLookupKind } from "@/lib/tags/claim-landing";
import { getTagByUuid } from "@/lib/tags/get-tag-by-uuid";

function isMissingShowcaseColumnError(error: {
  message?: string;
  code?: string;
}): boolean {
  return Boolean(error.message?.includes("show_on_public_showcase"));
}

function normalizePublicSlugVehicle(value: unknown): Vehicle | null {
  if (!value || typeof value !== "object") return null;
  const vehicle = value as Vehicle;
  if (typeof vehicle.id !== "string" || typeof vehicle.make !== "string") {
    return null;
  }
  return withDefaultShowcaseFields({
    ...vehicle,
    user_id: "",
    vin: null,
    model: typeof vehicle.model === "string" ? vehicle.model : "",
    year: typeof vehicle.year === "number" ? vehicle.year : null,
    tech_specs: parseVehicleTechSpecs(vehicle.tech_specs),
    silhouette_image_url:
      typeof vehicle.silhouette_image_url === "string"
        ? vehicle.silhouette_image_url
        : null,
    sound_url:
      typeof vehicle.sound_url === "string" ? vehicle.sound_url : null,
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

  return (Array.isArray(data) ? (data as unknown as Document[]) : []).map(
    (doc) => ({
      ...doc,
      line_items: parseLineItems(doc.line_items),
      // Query already scoped to opted-in rows — keep the flag explicit for extract.
      show_on_public_showcase: true,
    }),
  );
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
  return normalizePublicSlugVehicle(record.vehicle);
}

async function loadVehicleBySlugAdmin(slug: string): Promise<Vehicle | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const admin = createAdminClient();
  const { data, error } = await loadVehicleProjectionMaybeSingle(
    admin.from("vehicles"),
    { column: "public_slug", value: slug.trim() },
    { column: "is_public", value: true },
  );

  if (error) {
    throw new Error(`Failed to resolve public slug: ${error.message}`);
  }
  return data ? normalizePublicSlugVehicle(data) : null;
}

export type PublicVehicleLookup =
  | { kind: "tag"; result: TagScanResult }
  | { kind: "slug"; vehicle: Vehicle };

/**
 * Resolve `/v/{identifier}` — physical tag UUID or vehicles.public_slug.
 * Unclaimed tags resolve as null (same as unknown UUIDs) so GET cannot
 * enumerate unsold inventory.
 */
async function resolvePublicVehicleEntryUncached(
  identifier: string,
): Promise<PublicVehicleLookup | null> {
  const normalized = identifier.trim();
  if (!normalized) return null;

  const tagResult = await getTagByUuid(normalized);
  const lookup = publicScanLookupKind(normalized, tagResult);

  if (lookup === "tag" && tagResult) {
    return { kind: "tag", result: tagResult };
  }

  if (lookup === "absent") {
    return null;
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

const PUBLIC_SHOWCASE_VEHICLE_ENRICH_COLUMNS =
  `sound_url, public_slug, is_story_public, hide_financials, ${VEHICLE_BUILD_DNA_COLUMNS}` as const;

const PUBLIC_SHOWCASE_VEHICLE_ENRICH_FALLBACK_COLUMNS =
  "sound_url, public_slug, is_story_public, hide_financials" as const;

function isMissingVehicleStoryColumnError(error: {
  message?: string;
}): boolean {
  const message = error.message ?? "";
  return message.includes("is_story_public");
}

/**
 * Public tag/slug resolvers omit `sound_url`, Build DNA cache, and sometimes
 * `is_story_public`. Hydrate from service role for reliable guest showcase.
 */
export async function enrichPublicShowcaseVehicle(
  vehicle: Vehicle,
): Promise<Vehicle> {
  if (!vehicle.is_public) {
    return withDefaultShowcaseFields(vehicle);
  }

  if (!isSupabaseAdminConfigured()) {
    return withDefaultShowcaseFields(vehicle);
  }

  const admin = createAdminClient();
  let data: Record<string, unknown> | null = null;

  const primary = await admin
    .from("vehicles")
    .select(PUBLIC_SHOWCASE_VEHICLE_ENRICH_COLUMNS)
    .eq("id", vehicle.id)
    .eq("is_public", true)
    .maybeSingle();

  if (!primary.error && primary.data) {
    data = primary.data as Record<string, unknown>;
  } else if (primary.error) {
    const missingDna = isMissingVehicleBuildDnaColumnError(primary.error);
    const missingStory = isMissingVehicleStoryColumnError(primary.error);
    if (missingDna || missingStory) {
      const fallback = await admin
        .from("vehicles")
        .select(PUBLIC_SHOWCASE_VEHICLE_ENRICH_FALLBACK_COLUMNS)
        .eq("id", vehicle.id)
        .eq("is_public", true)
        .maybeSingle();
      if (!fallback.error && fallback.data) {
        data = fallback.data as Record<string, unknown>;
      }
    }
  }

  if (!data) {
    return withDefaultShowcaseFields(vehicle);
  }

  const soundUrl =
    typeof data.sound_url === "string" ? data.sound_url.trim() : "";

  return withDefaultShowcaseFields({
    ...vehicle,
    sound_url: soundUrl || vehicle.sound_url,
    public_slug:
      typeof data.public_slug === "string"
        ? data.public_slug
        : vehicle.public_slug,
    is_story_public: data.is_story_public === true,
    hide_financials: data.hide_financials !== false,
    showcase_build_dna:
      (data.showcase_build_dna as Vehicle["showcase_build_dna"]) ??
      vehicle.showcase_build_dna,
    showcase_build_dna_fingerprint:
      typeof data.showcase_build_dna_fingerprint === "string"
        ? data.showcase_build_dna_fingerprint
        : vehicle.showcase_build_dna_fingerprint,
    showcase_build_dna_updated_at:
      typeof data.showcase_build_dna_updated_at === "string"
        ? data.showcase_build_dna_updated_at
        : vehicle.showcase_build_dna_updated_at,
  });
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
