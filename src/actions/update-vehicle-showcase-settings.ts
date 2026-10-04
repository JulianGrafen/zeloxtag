"use server";

import { revalidatePath } from "next/cache";

import { getActiveTagUuidForVehicle } from "@/lib/tags/get-active-tag-uuid-for-vehicle";
import { garagePathForVehicle } from "@/lib/vehicle-surface/paths";
import { assertVehicleOwner } from "@/lib/vehicles/assert-owner";
import { resolveShowcaseSharePath } from "@/lib/vehicles/public-profile-status";
import {
  generatePublicSlug,
  isValidPublicSlug,
  publicShowcasePath,
} from "@/lib/vehicles/public-slug";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/security/public-error";

export type UpdateVehicleShowcaseSettingsInput = {
  vehicleId: string;
  /** Optional — used for tag-route revalidation when already known. */
  tagUuid?: string;
  isPublic: boolean;
  hideFinancials: boolean;
  showcaseSwipeOptIn?: boolean;
  isStoryPublic?: boolean;
};

export type UpdateVehicleShowcaseSettingsResult =
  | { status: "ok"; publicSlug: string | null; sharePath: string | null }
  | { status: "error"; message: string };

export async function updateVehicleShowcaseSettings(
  input: UpdateVehicleShowcaseSettingsInput,
): Promise<UpdateVehicleShowcaseSettingsResult> {
  try {
    const vehicleId = input.vehicleId.trim();
    const tagUuidHint = input.tagUuid?.trim() ?? "";

    if (!vehicleId) {
      return { status: "error", message: "Fahrzeug fehlt." };
    }

    const { isConfigured } = getSupabaseEnv();
    if (!isConfigured) {
      return {
        status: "error",
        message: "Speichern ist lokal ohne Supabase nicht verfügbar.",
      };
    }

    const ownership = await assertVehicleOwner(vehicleId);
    if (!ownership.ok) {
      return {
        status: "error",
        message:
          ownership.reason === "unauthorized"
            ? "Bitte anmelden."
            : ownership.reason === "forbidden"
              ? "Nur der Fahrzeughalter kann Einstellungen ändern."
              : ownership.message,
      };
    }

    const supabase = await createClient();
    const { data: current, error: readError } = await supabase
      .from("vehicles")
      .select("public_slug, showcase_swipe_opt_in, is_story_public")
      .eq("id", vehicleId)
      .eq("user_id", ownership.userId)
      .maybeSingle();

    if (readError) {
      return {
        status: "error",
        message: `Laden fehlgeschlagen: ${readError.message}`,
      };
    }

    let publicSlug =
      typeof current?.public_slug === "string" ? current.public_slug : null;

    if (input.isPublic && !publicSlug) {
      publicSlug = generatePublicSlug();
    }

    if (publicSlug && !isValidPublicSlug(publicSlug)) {
      publicSlug = generatePublicSlug();
    }

    const previousSwipeOptIn = Boolean(current?.showcase_swipe_opt_in);
    let showcaseSwipeOptIn = previousSwipeOptIn;
    if (!input.isPublic) {
      showcaseSwipeOptIn = false;
    } else if (input.showcaseSwipeOptIn !== undefined) {
      showcaseSwipeOptIn = input.showcaseSwipeOptIn;
    }

    const previousStoryPublic = Boolean(current?.is_story_public);
    let isStoryPublic = previousStoryPublic;
    if (!input.isPublic) {
      isStoryPublic = false;
    } else if (input.isStoryPublic !== undefined) {
      isStoryPublic = input.isStoryPublic;
    }

    const { error } = await supabase
      .from("vehicles")
      .update({
        is_public: input.isPublic,
        hide_financials: input.hideFinancials,
        public_slug: publicSlug,
        showcase_swipe_opt_in: showcaseSwipeOptIn,
        is_story_public: isStoryPublic,
      })
      .eq("id", vehicleId)
      .eq("user_id", ownership.userId);

    if (error) {
      logServerError("[update-vehicle-showcase-settings] update failed", error);
      const missingColumn =
        error.message.includes("is_public") ||
        error.message.includes("public_slug") ||
        error.message.includes("showcase_swipe_opt_in") ||
        error.message.includes("is_story_public") ||
        error.code === "PGRST204";

      if (missingColumn) {
        return {
          status: "error",
          message:
            "Showcase-Einstellungen brauchen die aktuelle Supabase-Migration (Showcase / Build-Swipe).",
        };
      }

      return {
        status: "error",
        message: "Speichern fehlgeschlagen.",
      };
    }

    const activeTagUuid = await getActiveTagUuidForVehicle(vehicleId);
    const tagUuidForRevalidate = activeTagUuid ?? tagUuidHint;

    revalidatePath(garagePathForVehicle(vehicleId));
    revalidatePath(garagePathForVehicle(vehicleId, "einstellungen"));
    revalidatePath(garagePathForVehicle(vehicleId, "einstellungen/profil"));

    if (tagUuidForRevalidate) {
      revalidatePath(`/v/${tagUuidForRevalidate}`);
      revalidatePath(`/v/${tagUuidForRevalidate}/daten`);
      revalidatePath(`/v/${tagUuidForRevalidate}/einstellungen`);
      revalidatePath(`/v/${tagUuidForRevalidate}/einstellungen/profil`);
    }

    const sharePath = resolveShowcaseSharePath({
      isPublic: input.isPublic,
      publicSlug,
      hasActiveTag: Boolean(activeTagUuid?.trim()),
      pathForSlug: publicShowcasePath,
    });

    if (sharePath) {
      revalidatePath(sharePath);
    }

    return {
      status: "ok",
      publicSlug,
      sharePath,
    };
  } catch (error) {
    logServerError("[update-vehicle-showcase-settings] unexpected", error);
    return {
      status: "error",
      message: "Showcase-Einstellungen konnten nicht gespeichert werden.",
    };
  }
}
