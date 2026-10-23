import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { optimizeWebImageBytes } from "@/lib/image/optimize-web-image";
import {
  optimizedImageCacheKey,
  readOptimizedImageCache,
  writeOptimizedImageCache,
} from "@/lib/image/optimized-image-cache";
import { loadShareCardHeroBytes } from "@/lib/share/resolve-share-card-hero";
import { enforceRateLimit } from "@/lib/security/api-guard";
import { logServerError } from "@/lib/security/public-error";
import { SILHOUETTE_SHOWCASE_HERO_MAX_EDGE } from "@/lib/vehicles/silhouette-constants";
import {
  imageContentTypeFromBytes,
  isLikelyImageBytes,
} from "@/lib/vehicles/silhouette-bytes";
import { assertVehicleOwner } from "@/lib/vehicles/assert-owner";
import { createClient } from "@/lib/supabase/server";
import type { Document, Vehicle } from "@/types/database";

export const runtime = "nodejs";

const vehicleIdSchema = z.string().uuid();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ vehicleId: string }> },
) {
  const limited = await enforceRateLimit(
    request,
    "apiDefault",
    "vehicle-story-hero",
  );
  if (limited) return limited;

  const { vehicleId: rawId } = await context.params;
  const parsed = vehicleIdSchema.safeParse(rawId);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid vehicle id." }, { status: 400 });
  }

  const vehicleId = parsed.data;
  const ownership = await assertVehicleOwner(vehicleId);
  if (!ownership.ok) {
    const status =
      ownership.reason === "unauthorized"
        ? 401
        : ownership.reason === "forbidden"
          ? 403
          : ownership.reason === "unconfigured"
            ? 503
            : 404;
    return NextResponse.json({ error: ownership.message }, { status });
  }

  const supabase = await createClient();
  const [{ data: vehicle, error: vehicleError }, { data: documents, error: docsError }] =
    await Promise.all([
      supabase
        .from("vehicles")
        .select("*")
        .eq("id", vehicleId)
        .eq("user_id", ownership.userId)
        .maybeSingle(),
      supabase
        .from("documents")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: false }),
    ]);

  if (vehicleError || !vehicle) {
    return NextResponse.json(
      { error: vehicleError?.message ?? "Vehicle not found." },
      { status: 404 },
    );
  }
  if (docsError) {
    return NextResponse.json({ error: docsError.message }, { status: 500 });
  }

  const version = request.nextUrl.searchParams.get("v")?.trim() ?? "1";
  const cacheKey = optimizedImageCacheKey({
    scope: "story-hero",
    id: vehicleId,
    maxEdgePx: SILHOUETTE_SHOWCASE_HERO_MAX_EDGE,
    version,
  });
  const cached = readOptimizedImageCache(cacheKey);
  if (cached) {
    return new NextResponse(new Uint8Array(cached.body), {
      status: 200,
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  }

  const bytes = await loadShareCardHeroBytes(
    vehicle as Vehicle,
    (documents ?? []) as Document[],
    {
      fetchOrigin: request.nextUrl.origin,
      cookieHeader: request.headers.get("cookie") ?? undefined,
    },
  );

  if (!bytes || !isLikelyImageBytes(bytes)) {
    return NextResponse.json(
      { error: "Fahrzeugbild nicht gefunden." },
      { status: 404 },
    );
  }

  try {
    const { body, contentType } = await optimizeWebImageBytes(bytes, {
      maxEdgePx: SILHOUETTE_SHOWCASE_HERO_MAX_EDGE,
    });
    writeOptimizedImageCache(cacheKey, body, contentType);
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    logServerError("[vehicle-story-hero] optimize failed", error);
    const contentType = isLikelyImageBytes(bytes)
      ? imageContentTypeFromBytes(bytes)
      : "image/jpeg";
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  }
}
