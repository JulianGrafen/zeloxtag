import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  optimizedImageCacheKey,
  readOptimizedImageCache,
  writeOptimizedImageCache,
} from "@/lib/image/optimized-image-cache";
import { optimizeWebImageBytes } from "@/lib/image/optimize-web-image";
import { getCurrentUser } from "@/lib/auth/get-user";
import { sessionCanAccessVehicleMedia } from "@/lib/auth/vehicle-access";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { logServerError } from "@/lib/security/public-error";
import { loadVehicleSilhouetteBytes } from "@/lib/vehicles/load-silhouette-bytes";
import {
  imageContentTypeFromBytes,
  isLikelyImageBytes,
} from "@/lib/vehicles/silhouette-bytes";

export const runtime = "nodejs";

const vehicleIdSchema = z.string().uuid();
const DEFAULT_MAX_EDGE = 960;
const MIN_MAX_EDGE = 128;
const MAX_MAX_EDGE = 1600;

function parseMaxEdgePx(request: NextRequest): number {
  const raw = request.nextUrl.searchParams.get("w");
  if (!raw) {
    return DEFAULT_MAX_EDGE;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_MAX_EDGE;
  }
  return Math.min(MAX_MAX_EDGE, Math.max(MIN_MAX_EDGE, parsed));
}

function silhouetteCacheControl(
  request: NextRequest,
  isPublicShowcase: boolean,
): string {
  const version = request.nextUrl.searchParams.get("v");
  if (version?.trim()) {
    return isPublicShowcase
      ? "public, max-age=31536000, immutable"
      : "private, max-age=31536000, immutable";
  }
  return isPublicShowcase
    ? "public, max-age=3600, stale-while-revalidate=86400"
    : "private, max-age=3600";
}

function rawImageResponse(
  bytes: Uint8Array,
  cacheControl: string,
): NextResponse {
  const contentType = isLikelyImageBytes(bytes)
    ? imageContentTypeFromBytes(bytes)
    : "application/octet-stream";
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}

async function imageResponse(
  bytes: Uint8Array,
  maxEdgePx: number,
  cacheControl: string,
): Promise<NextResponse> {
  try {
    const { body, contentType } = await optimizeWebImageBytes(bytes, {
      maxEdgePx,
    });
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    logServerError("[vehicle-silhouette] optimize failed", error);
    return rawImageResponse(bytes, cacheControl);
  }
}

/**
 * GET /api/vehicle/silhouette/[vehicleId]
 * Same-origin image stream for dashboard headers under COEP.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ vehicleId: string }> },
) {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured || !isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Storage not configured." },
      { status: 503 },
    );
  }

  const { vehicleId: rawId } = await context.params;
  const parsed = vehicleIdSchema.safeParse(rawId);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid vehicle id." },
      { status: 400 },
    );
  }

  const viewer = await getCurrentUser();
  const access = await sessionCanAccessVehicleMedia(
    parsed.data,
    viewer?.id ?? null,
  );
  if (!access.allowed) {
    return NextResponse.json(
      { ok: false, error: "Vehicle photo not found." },
      { status: 404 },
    );
  }

  const bytes = await loadVehicleSilhouetteBytes(parsed.data);
  if (!bytes) {
    return NextResponse.json(
      { ok: false, error: "Vehicle photo not found." },
      { status: 404 },
    );
  }

  const maxEdgePx = parseMaxEdgePx(request);
  const version = request.nextUrl.searchParams.get("v")?.trim() ?? "";
  const cacheControl = silhouetteCacheControl(request, access.isPublicShowcase);

  const cacheKey = optimizedImageCacheKey({
    scope: "silhouette",
    id: parsed.data,
    maxEdgePx,
    version,
  });
  const cached = readOptimizedImageCache(cacheKey);
  if (cached) {
    return new NextResponse(new Uint8Array(cached.body), {
      status: 200,
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": cacheControl,
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  }

  try {
    const { body, contentType } = await optimizeWebImageBytes(bytes, {
      maxEdgePx,
    });
    writeOptimizedImageCache(cacheKey, body, contentType);
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    logServerError("[vehicle-silhouette] optimize failed", error);
    return rawImageResponse(bytes, cacheControl);
  }
}
