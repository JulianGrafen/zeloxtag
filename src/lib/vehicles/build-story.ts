import "server-only";

import { parseJsonbRpcArray } from "@/lib/showcase/parse-jsonb-rpc-array";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  mapPublicBuildStoryRow,
  type BuildStoryEntry,
  type PublicBuildStoryRow,
} from "@/lib/vehicles/build-story-map";

export type { BuildStoryEntry } from "@/lib/vehicles/build-story-map";

export type PublicBuildStoryPage = {
  vehicleId: string;
  entries: BuildStoryEntry[];
  hasMore: boolean;
};

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;

function clampLimit(limit: number | undefined): number {
  if (limit == null || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

function clampOffset(offset: number | undefined): number {
  if (offset == null || !Number.isFinite(offset)) return 0;
  return Math.max(0, Math.floor(offset));
}

export async function loadPublicBuildStoryBySlug(
  slug: string,
  options?: { limit?: number; offset?: number; vehicleId?: string },
): Promise<PublicBuildStoryPage | null> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) return null;

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return { vehicleId: options?.vehicleId ?? "", entries: [], hasMore: false };
  }

  const limit = clampLimit(options?.limit);
  const offset = clampOffset(options?.offset);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_public_build_story", {
    p_slug: normalizedSlug,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = parseJsonbRpcArray(data) as PublicBuildStoryRow[];
  const vehicleId =
    options?.vehicleId?.trim() ||
    (await resolveVehicleIdForPublicStorySlug(normalizedSlug)) ||
    "";

  const entries: BuildStoryEntry[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const mapped = mapPublicBuildStoryRow(vehicleId, row as PublicBuildStoryRow);
    if (mapped) entries.push(mapped);
  }

  return {
    vehicleId,
    entries,
    hasMore: rows.length >= limit,
  };
}

async function resolveVehicleIdForPublicStorySlug(
  slug: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_public_vehicle_by_slug", {
    p_slug: slug,
  });

  if (error || !data || typeof data !== "object") return null;
  const record = data as { vehicle?: { id?: unknown } };
  const id = record.vehicle?.id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}
