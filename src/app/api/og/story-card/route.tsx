import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { resolvePublicAppOrigin } from "@/lib/api/resolve-api-base-url";
import { fetchOgImageDataUri } from "@/lib/og/fetch-og-image-bytes";
import {
  buildStoryCardOgPayload,
  resolveStoryCardHeroAbsoluteUrl,
} from "@/lib/og/story-card/build-story-card-og-payload";
import { loadStoryCardOgFonts } from "@/lib/og/story-card/load-story-card-og-fonts";
import { StoryCardOgTemplate } from "@/lib/og/story-card/story-card-og-template";
import {
  SHAREABLE_SPEC_CARD_HEIGHT_PX,
  SHAREABLE_SPEC_CARD_WIDTH_PX,
} from "@/components/shareable-spec-card/constants";
import { enforceRateLimit } from "@/lib/security/api-guard";
import { assertVehicleOwner } from "@/lib/vehicles/assert-owner";
import { createClient } from "@/lib/supabase/server";
import type { Document, Vehicle } from "@/types/database";

export const runtime = "nodejs";

const vehicleIdSchema = z.string().uuid();

async function loadFontsFallback() {
  try {
    return await loadStoryCardOgFonts();
  } catch {
    return undefined;
  }
}

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "apiDefault", "og-story-card");
  if (limited) return limited;

  const vehicleIdRaw = request.nextUrl.searchParams.get("vehicleId");
  const parsed = vehicleIdSchema.safeParse(vehicleIdRaw);
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

  const origin = resolvePublicAppOrigin();
  const heroAbsolute = resolveStoryCardHeroAbsoluteUrl(
    vehicle as Vehicle,
    (documents ?? []) as Document[],
    origin,
  );
  const heroFetch = await fetchOgImageDataUri(heroAbsolute);
  const heroImageDataUri = heroFetch.ok ? heroFetch.dataUri : null;

  const payload = buildStoryCardOgPayload({
    vehicle: vehicle as Vehicle,
    documents: (documents ?? []) as Document[],
    siteOrigin: origin,
    heroImageDataUri,
  });

  if (!payload) {
    return NextResponse.json(
      { error: "Not enough showcase data to render story card." },
      { status: 422 },
    );
  }

  const fonts = await loadFontsFallback();

  return new ImageResponse(
    <StoryCardOgTemplate payload={payload} />,
    {
      width: SHAREABLE_SPEC_CARD_WIDTH_PX,
      height: SHAREABLE_SPEC_CARD_HEIGHT_PX,
      fonts,
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    },
  );
}
