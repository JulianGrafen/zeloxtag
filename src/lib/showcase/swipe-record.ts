import "server-only";

import { parseShowcaseSwipeDecision } from "@/lib/showcase/parse-swipe-decision";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidPublicSlug } from "@/lib/vehicles/public-slug";
import { notifyShowcaseLikeReceived } from "@/lib/email/showcase-like-email";

export type RecordShowcaseSwipeInput = {
  publicSlug: string;
  decision: unknown;
};

export type RecordShowcaseSwipeResult =
  | { ok: true; decision: "like" | "pass" }
  | { ok: false; status: number; error: string };

export async function recordShowcaseSwipe(
  input: RecordShowcaseSwipeInput,
): Promise<RecordShowcaseSwipeResult> {
  const decision = parseShowcaseSwipeDecision(input.decision);
  const publicSlug = input.publicSlug.trim();

  if (!decision || !isValidPublicSlug(publicSlug)) {
    return { ok: false, status: 400, error: "Ungültige Swipe-Anfrage." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "Bitte anmelden." };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      status: 503,
      error: "Swipe ist lokal nicht verfügbar.",
    };
  }

  const admin = createAdminClient();
  const { data: vehicle, error: loadError } = await admin
    .from("vehicles")
    .select(
      "id, user_id, make, model, is_public, showcase_swipe_opt_in, public_slug",
    )
    .eq("public_slug", publicSlug)
    .maybeSingle();

  if (loadError || !vehicle) {
    return { ok: false, status: 404, error: "Build nicht gefunden." };
  }

  if (!vehicle.is_public || !vehicle.showcase_swipe_opt_in) {
    return {
      ok: false,
      status: 403,
      error: "Dieser Build nimmt nicht am Swipe teil.",
    };
  }

  if (vehicle.user_id === user.id) {
    return {
      ok: false,
      status: 403,
      error: "Eigene Builds können nicht geswiped werden.",
    };
  }

  const { error: insertError } = await supabase.from("showcase_swipes").insert({
    swiper_user_id: user.id,
    vehicle_id: vehicle.id,
    decision,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        ok: false,
        status: 409,
        error: "Du hast diesen Build bereits bewertet.",
      };
    }
    return {
      ok: false,
      status: 500,
      error: "Swipe konnte nicht gespeichert werden.",
    };
  }

  if (decision === "like" && vehicle.user_id) {
    void notifyShowcaseLikeReceived({
      ownerUserId: vehicle.user_id,
      vehicleId: vehicle.id,
      vehicleLabel: `${vehicle.make} ${vehicle.model}`.trim(),
    }).catch((error) => {
      console.error("[showcase-swipe] like email failed", error);
    });
  }

  return { ok: true, decision };
}

export async function markShowcaseLikesSeen(options: {
  vehicleId?: string | null;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "Bitte anmelden." };
  }

  const vehicleId = options.vehicleId?.trim();
  const now = new Date().toISOString();

  if (vehicleId) {
    const { data: owned } = await supabase
      .from("vehicles")
      .select("id")
      .eq("id", vehicleId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!owned) {
      return { ok: false, status: 403, error: "Kein Zugriff auf dieses Fahrzeug." };
    }

    const { error } = await supabase.from("vehicle_showcase_like_inbox").upsert(
      {
        user_id: user.id,
        vehicle_id: vehicleId,
        last_seen_at: now,
      },
      { onConflict: "user_id,vehicle_id" },
    );

    if (error) {
      return { ok: false, status: 500, error: "Konnte Likes nicht markieren." };
    }

    return { ok: true };
  }

  const { data: vehicles, error: listError } = await supabase
    .from("vehicles")
    .select("id")
    .eq("user_id", user.id);

  if (listError) {
    return { ok: false, status: 500, error: "Fahrzeuge konnten nicht geladen werden." };
  }

  const rows = (vehicles ?? []).map((v) => ({
    user_id: user.id,
    vehicle_id: v.id,
    last_seen_at: now,
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from("vehicle_showcase_like_inbox")
      .upsert(rows, { onConflict: "user_id,vehicle_id" });
    if (error) {
      return { ok: false, status: 500, error: "Konnte Likes nicht markieren." };
    }
  }

  return { ok: true };
}
