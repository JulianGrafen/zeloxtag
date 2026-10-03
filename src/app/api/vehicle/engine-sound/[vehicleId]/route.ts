import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getApiRouteUser } from "@/lib/auth/get-user";
import { enforceRateLimit } from "@/lib/security/api-guard";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  ENGINE_SOUND_BUCKET,
  resolveStoredEngineSoundPath,
  vehicleEngineSoundCandidatePaths,
} from "@/lib/vehicles/engine-sound-constants";
import { buildEngineSoundHttpResponse } from "@/lib/vehicles/serve-engine-sound-bytes";

export const runtime = "nodejs";

const vehicleIdSchema = z.string().uuid();

/**
 * Session proxy for owner preview of the engine soundcheck.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ vehicleId: string }> },
) {
  const limited = await enforceRateLimit(
    request,
    "apiDefault",
    "vehicle-engine-sound",
  );
  if (limited) return limited;

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return NextResponse.json(
      { error: "Storage not configured." },
      { status: 503 },
    );
  }

  const { vehicleId: rawId } = await context.params;
  const parsed = vehicleIdSchema.safeParse(rawId);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid vehicle id." }, { status: 400 });
  }

  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Storage not configured." },
      { status: 503 },
    );
  }

  const vehicleId = parsed.data;
  const supabase = await createClient();
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("sound_url, user_id")
    .eq("id", vehicleId)
    .maybeSingle();

  if (!vehicle || vehicle.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const preferredPath = resolveStoredEngineSoundPath(vehicleId, vehicle.sound_url);
  const paths = [
    preferredPath,
    ...vehicleEngineSoundCandidatePaths(vehicleId),
  ].filter((path, index, all): path is string => {
    return Boolean(path) && all.indexOf(path) === index;
  });

  const admin = createAdminClient();
  for (const path of paths) {
    const { data, error } = await admin.storage
      .from(ENGINE_SOUND_BUCKET)
      .download(path);
    if (error || !data) continue;

    return buildEngineSoundHttpResponse(
      data,
      path,
      "private, max-age=60",
    );
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
