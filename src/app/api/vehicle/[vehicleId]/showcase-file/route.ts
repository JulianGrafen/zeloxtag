import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { documentMediaKind } from "@/lib/documents/viewable-url";
import { optimizeWebImageBytes } from "@/lib/image/optimize-web-image";
import {
  optimizedImageCacheKey,
  readOptimizedImageCache,
  writeOptimizedImageCache,
} from "@/lib/image/optimized-image-cache";
import { enforceRateLimit } from "@/lib/security/api-guard";
import { logServerError } from "@/lib/security/public-error";
import { loadShowcaseStorageImageBytes } from "@/lib/vehicles/load-showcase-storage-image";
import { SILHOUETTE_SHOWCASE_GALLERY_MAX_EDGE } from "@/lib/vehicles/silhouette-constants";
import {
  imageContentTypeFromBytes,
  isLikelyImageBytes,
} from "@/lib/vehicles/silhouette-bytes";
import { assertVehicleOwner } from "@/lib/vehicles/assert-owner";

export const runtime = "nodejs";

const MIN_MAX_EDGE = 128;
const MAX_MAX_EDGE = 1600;

const vehicleIdSchema = z.string().uuid();
const querySchema = z
  .object({
    src: z.string().trim().min(1).max(2048),
  })
  .strict();

function parseMaxEdgePx(request: NextRequest): number | null {
  const raw = request.nextUrl.searchParams.get("w");
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(MAX_MAX_EDGE, Math.max(MIN_MAX_EDGE, parsed));
}

/**
 * Owner-only showcase gallery proxy (no is_public gate).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ vehicleId: string }> },
) {
  const limited = await enforceRateLimit(
    request,
    "apiDefault",
    "vehicle-showcase-file",
  );
  if (limited) return limited;

  const { vehicleId: rawId } = await context.params;
  const parsedId = vehicleIdSchema.safeParse(rawId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid vehicle id." }, { status: 400 });
  }

  const queryParsed = querySchema.safeParse({
    src: request.nextUrl.searchParams.get("src")?.trim() ?? "",
  });
  if (!queryParsed.success) {
    return NextResponse.json({ error: "src is required." }, { status: 400 });
  }

  const vehicleId = parsedId.data;
  const src = queryParsed.data.src;

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

  if (documentMediaKind(src) !== "image") {
    return NextResponse.json({ error: "Media type not allowed." }, { status: 403 });
  }

  const maxEdgePx =
    parseMaxEdgePx(request) ?? SILHOUETTE_SHOWCASE_GALLERY_MAX_EDGE;
  const cacheKey = optimizedImageCacheKey({
    scope: "owner-showcase-file",
    id: `${vehicleId}:${src}`,
    maxEdgePx,
    version: "1",
  });
  const cached = readOptimizedImageCache(cacheKey);
  if (cached) {
    return new NextResponse(new Uint8Array(cached.body), {
      status: 200,
      headers: {
        "Content-Type": cached.contentType,
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  }

  const bytes = await loadShowcaseStorageImageBytes(vehicleId, src);
  if (!bytes || !isLikelyImageBytes(bytes)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const optimized = await optimizeWebImageBytes(bytes, { maxEdgePx });
    writeOptimizedImageCache(
      cacheKey,
      optimized.body,
      optimized.contentType,
    );
    return new NextResponse(new Uint8Array(optimized.body), {
      status: 200,
      headers: {
        "Content-Type": optimized.contentType,
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    logServerError("[vehicle-showcase-file] optimize failed", error);
    const contentType = imageContentTypeFromBytes(bytes);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  }
}
