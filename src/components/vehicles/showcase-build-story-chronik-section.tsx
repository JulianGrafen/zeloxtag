"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy } from "lucide-react";

import { updateVehicleShowcaseSettings } from "@/actions/update-vehicle-showcase-settings";
import { IOSGroupedList, IOSListItem } from "@/components/ui/ios";
import { BuildStoryOwnerPreview } from "@/components/vehicles/build-story-owner-preview";
import { VehicleIosSettingsToggleRow } from "@/components/vehicles/vehicle-ios-settings-toggle-row";
import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { PRODUCTION_SITE_URL } from "@/lib/constants/public-site-url";
import { listOwnerBuildStoryPreviewEntries } from "@/lib/vehicles/build-story-owner-entries";
import { resolveShowcaseSharePath } from "@/lib/vehicles/public-profile-status";
import { publicShowcasePath } from "@/lib/vehicles/public-slug";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import { showSavedToast } from "@/lib/ui/saved-toast";
import type { Document, Vehicle } from "@/types/database";

type ShowcaseBuildStoryChronikSectionProps = {
  vehicle: Vehicle;
  documents: Document[];
  tagUuid: string;
  vehicleSurfaceScope?: VehicleSurfaceScope;
  canEdit: boolean;
  hasLinkedTag: boolean;
};

export function ShowcaseBuildStoryChronikSection({
  vehicle,
  documents,
  tagUuid,
  vehicleSurfaceScope,
  canEdit,
  hasLinkedTag,
}: ShowcaseBuildStoryChronikSectionProps) {
  const isPublic = Boolean(vehicle.is_public);
  const [isStoryPublic, setIsStoryPublic] = useState(
    Boolean(vehicle.is_story_public),
  );
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const previewEntries = useMemo(
    () => listOwnerBuildStoryPreviewEntries(vehicle.id, documents, 3),
    [vehicle.id, documents],
  );

  const sharePath = resolveShowcaseSharePath({
    isPublic,
    publicSlug: vehicle.public_slug,
    hasActiveTag: hasLinkedTag,
    pathForSlug: publicShowcasePath,
  });
  const shareUrl = sharePath ? `${PRODUCTION_SITE_URL}${sharePath}` : null;
  const showcasePreviewHref = sharePath ?? null;

  const storyPassHref = vehicleSurfaceScope
    ? vehicleSurfaceHref(vehicleSurfaceScope, "einstellungen/story-pass")
    : `/v/${tagUuid}/einstellungen/story-pass`;

  function saveStoryPublic(
    value: boolean,
    onError?: () => void,
  ) {
    if (!canEdit) return;
    startTransition(async () => {
      setError(null);
      const result = await updateVehicleShowcaseSettings({
        vehicleId: vehicle.id,
        tagUuid,
        isPublic,
        hideFinancials: Boolean(vehicle.hide_financials),
        showcaseSwipeOptIn: Boolean(vehicle.showcase_swipe_opt_in),
        isStoryPublic: value,
      });
      if (result.status === "error") {
        setError(result.message);
        onError?.();
        return;
      }
      showSavedToast();
    });
  }

  async function copyShareLink() {
    if (!shareUrl || typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareMessage("Link kopiert.");
    } catch {
      setError("Link konnte nicht kopiert werden.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <IOSGroupedList headerTitle="Build-Chronik">
        <VehicleIosSettingsToggleRow
          label="Chronik öffentlich"
          sublabel="Chronologische Timeline für Profil- und QR-Besucher"
          checked={isStoryPublic}
          disabled={!canEdit || !isPublic || pending}
          onCheckedChange={(value) => {
            const previous = isStoryPublic;
            setIsStoryPublic(value);
            saveStoryPublic(value, () => setIsStoryPublic(previous));
          }}
        />
        <BuildStoryOwnerPreview
          entries={previewEntries}
          showcaseHref={isPublic && isStoryPublic ? showcasePreviewHref : null}
        />
        {shareUrl ? (
          <IOSListItem
            label="Chronik teilen"
            sublabel={shareUrl.replace(/^https?:\/\//, "")}
            showChevron={false}
            trailing={
              <PressableButton
                type="button"
                variant="button"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-[13px] font-medium text-white"
                onClick={copyShareLink}
                disabled={!isPublic || !isStoryPublic}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Kopieren
              </PressableButton>
            }
          />
        ) : (
          <IOSListItem
            label="Chronik teilen"
            sublabel={
              isPublic
                ? "Share-Link wird vorbereitet…"
                : "Verfügbar, sobald das Profil öffentlich ist."
            }
            showChevron={false}
          />
        )}
        <VehicleSettingsSubmenuLink
          href={storyPassHref}
          title="Story-Karte"
          subtitle="9:16 Story und 3:4 Post für Social"
          isLast
        />
      </IOSGroupedList>

      {shareMessage ? (
        <p className="px-4 text-[13px] text-[#30D158]">{shareMessage}</p>
      ) : null}
      {error ? (
        <p className="px-4 text-[13px] text-[#FF453A]" role="alert">{error}</p>
      ) : null}
    </div>
  );
}
