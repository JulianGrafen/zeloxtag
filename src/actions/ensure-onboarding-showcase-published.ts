"use server";

import { updateVehicleShowcaseSettings } from "@/actions/update-vehicle-showcase-settings";
import { assertVehicleOwner } from "@/lib/vehicles/assert-owner";
import { resolveShowcaseSharePath } from "@/lib/vehicles/public-profile-status";
import { publicShowcasePath } from "@/lib/vehicles/public-slug";
import { PRODUCTION_SITE_URL } from "@/lib/constants/public-site-url";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/security/public-error";

export type EnsureOnboardingShowcasePublishedInput = {
  vehicleId: string;
  tagUuid?: string;
};

export type EnsureOnboardingShowcasePublishedResult =
  | { status: "ok"; sharePath: string; shareUrl: string; publicSlug: string }
  | { status: "error"; message: string };

/**
 * Idempotent: ensures the vehicle has a public showcase + slug for onboarding share.
 */
export async function ensureOnboardingShowcasePublished(
  input: EnsureOnboardingShowcasePublishedInput,
): Promise<EnsureOnboardingShowcasePublishedResult> {
  const vehicleId = input.vehicleId.trim();
  const tagUuid = input.tagUuid?.trim() || undefined;

  if (!vehicleId) {
    return { status: "error", message: "Fahrzeug fehlt." };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return {
      status: "error",
      message: "Showcase-Link ist lokal ohne Supabase nicht verfügbar.",
    };
  }

  const ownership = await assertVehicleOwner(vehicleId);
  if (!ownership.ok) {
    return {
      status: "error",
      message:
        ownership.reason === "unauthorized"
          ? "Bitte anmelden."
          : "Nur der Fahrzeughalter kann den Showcase freigeben.",
    };
  }

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("vehicles")
    .select(
      "is_public, public_slug, hide_financials, showcase_swipe_opt_in, is_story_public",
    )
    .eq("id", vehicleId)
    .eq("user_id", ownership.userId)
    .maybeSingle();

  if (readError) {
    logServerError("[ensure-onboarding-showcase] read failed", readError);
    return { status: "error", message: "Fahrzeug konnte nicht geladen werden." };
  }

  const isPublic = Boolean(current?.is_public);
  const publicSlug =
    typeof current?.public_slug === "string" ? current.public_slug.trim() : "";

  if (isPublic && publicSlug) {
    const sharePath = resolveShowcaseSharePath({
      isPublic: true,
      publicSlug,
      pathForSlug: publicShowcasePath,
    });
    if (sharePath) {
      return {
        status: "ok",
        sharePath,
        shareUrl: `${PRODUCTION_SITE_URL}${sharePath}`,
        publicSlug,
      };
    }
  }

  const hideFinancials = Boolean(current?.hide_financials);
  const result = await updateVehicleShowcaseSettings({
    vehicleId,
    tagUuid,
    isPublic: true,
    hideFinancials,
    showcaseSwipeOptIn: true,
    isStoryPublic: Boolean(current?.is_story_public),
  });

  if (result.status === "error") {
    return { status: "error", message: result.message };
  }

  if (!result.sharePath || !result.publicSlug) {
    return {
      status: "error",
      message: "Showcase-Link konnte nicht erstellt werden.",
    };
  }

  return {
    status: "ok",
    sharePath: result.sharePath,
    shareUrl: `${PRODUCTION_SITE_URL}${result.sharePath}`,
    publicSlug: result.publicSlug,
  };
}
