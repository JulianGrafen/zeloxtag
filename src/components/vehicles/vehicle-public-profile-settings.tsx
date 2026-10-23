"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Copy } from "lucide-react";

import { updateVehicleShowcaseSettings } from "@/actions/update-vehicle-showcase-settings";
import { IOSGroupedList, IOSListItem } from "@/components/ui/ios";
import { VehicleIosSettingsToggleRow } from "@/components/vehicles/vehicle-ios-settings-toggle-row";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { PRODUCTION_SITE_URL } from "@/lib/constants/public-site-url";
import { showSavedToast } from "@/lib/ui/saved-toast";
import { resolveShowcaseSharePath } from "@/lib/vehicles/public-profile-status";
import { publicShowcasePath } from "@/lib/vehicles/public-slug";

type VehiclePublicProfileSettingsProps = {
  tagUuid?: string;
  vehicleId: string;
  isPublic: boolean;
  hideFinancials: boolean;
  showcaseSwipeOptIn: boolean;
  isStoryPublic: boolean;
  publicSlug: string | null;
  canEdit: boolean;
  hasLinkedTag: boolean;
  tagShopUrl?: string;
  showcaseSwipeTotalLikes?: number;
  showcaseSwipeUnreadLikes?: number;
};

function initialSharePath(
  hasLinkedTag: boolean,
  isPublic: boolean,
  publicSlug: string | null,
): string | null {
  return resolveShowcaseSharePath({
    isPublic,
    publicSlug,
    hasActiveTag: hasLinkedTag,
    pathForSlug: publicShowcasePath,
  });
}

export function VehiclePublicProfileSettings({
  tagUuid,
  vehicleId,
  isPublic: initialIsPublic,
  hideFinancials: initialHideFinancials,
  showcaseSwipeOptIn: initialShowcaseSwipeOptIn,
  isStoryPublic: initialIsStoryPublic,
  publicSlug: initialPublicSlug,
  canEdit,
  hasLinkedTag,
  tagShopUrl,
  showcaseSwipeTotalLikes = 0,
  showcaseSwipeUnreadLikes = 0,
}: VehiclePublicProfileSettingsProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [hideFinancials, setHideFinancials] = useState(initialHideFinancials);
  const [showcaseSwipeOptIn, setShowcaseSwipeOptIn] = useState(
    initialShowcaseSwipeOptIn,
  );
  const [isStoryPublic, setIsStoryPublic] = useState(initialIsStoryPublic);
  const [sharePath, setSharePath] = useState<string | null>(
    initialSharePath(hasLinkedTag, initialIsPublic, initialPublicSlug),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startSettingsTransition] = useTransition();

  const shareUrl = sharePath ? `${PRODUCTION_SITE_URL}${sharePath}` : null;
  const showLikesRow =
    canEdit && (showcaseSwipeTotalLikes > 0 || showcaseSwipeUnreadLikes > 0);

  function saveSettings(
    next: {
      isPublic?: boolean;
      hideFinancials?: boolean;
      showcaseSwipeOptIn?: boolean;
      isStoryPublic?: boolean;
    },
    onError?: () => void,
  ) {
    if (!canEdit) return;

    const payload = {
      isPublic: next.isPublic ?? isPublic,
      hideFinancials: next.hideFinancials ?? hideFinancials,
      showcaseSwipeOptIn: next.showcaseSwipeOptIn ?? showcaseSwipeOptIn,
      isStoryPublic: next.isStoryPublic ?? isStoryPublic,
    };

    startSettingsTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await updateVehicleShowcaseSettings({
        vehicleId,
        tagUuid: tagUuid?.trim() || undefined,
        isPublic: payload.isPublic,
        hideFinancials: payload.hideFinancials,
        showcaseSwipeOptIn: payload.isPublic
          ? payload.showcaseSwipeOptIn
          : false,
        isStoryPublic: payload.isPublic ? payload.isStoryPublic : false,
      });

      if (result.status === "error") {
        onError?.();
        setError(result.message);
        return;
      }

      setSharePath(result.sharePath);
      showSavedToast();
      if (!payload.isPublic) {
        setMessage("Showcase ist privat.");
      } else if (result.sharePath) {
        setMessage("Showcase ist öffentlich — Link kann geteilt werden.");
      } else if (payload.showcaseSwipeOptIn) {
        setMessage("Im Build-Swipe sichtbar — Share-Link mit Zelox Tag.");
      } else {
        setMessage(
          "Showcase-Inhalte sind vorbereitet — Build-Swipe optional aktivieren.",
        );
      }
    });
  }

  async function copyShareLink() {
    if (!shareUrl || typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage("Link kopiert.");
    } catch {
      setError("Link konnte nicht kopiert werden.");
    }
  }

  const publicLabel = hasLinkedTag
    ? "Profil veröffentlichen"
    : "Showcase & Build-Swipe";
  const publicSublabel = hasLinkedTag
    ? "Showcase-Seite mit Share-Link aktivieren"
    : "Inhalte freigeben und optional im Build-Swipe zeigen";

  return (
    <div className="flex flex-col gap-5">
      {!canEdit ? (
        <p className="px-1 text-[13px] leading-relaxed text-zinc-400">
          In der Demo-Vorschau sind diese Schalter nur zur Ansicht — am eigenen
          Fahrzeug kannst du sie unter Showcase bearbeiten.
        </p>
      ) : null}

      <IOSGroupedList
        headerTitle="Sichtbarkeit"
        footerText={
          !isPublic
            ? "Aktiviere das öffentliche Showcase, um Build-Swipe und Build-Story zu nutzen."
            : undefined
        }
      >
        <div id="profil-veroeffentlichen" className="scroll-mt-24">
          <VehicleIosSettingsToggleRow
            label={publicLabel}
            sublabel={publicSublabel}
            checked={isPublic}
            disabled={!canEdit || pending}
            onCheckedChange={(value) => {
              const previous = isPublic;
              const previousSwipe = showcaseSwipeOptIn;
              const previousStory = isStoryPublic;
              setIsPublic(value);
              if (!value) {
                setShowcaseSwipeOptIn(false);
                setIsStoryPublic(false);
              }
              saveSettings(
                {
                  isPublic: value,
                  showcaseSwipeOptIn: value
                    ? isPublic
                      ? showcaseSwipeOptIn
                      : true
                    : false,
                  isStoryPublic: value ? isStoryPublic : false,
                },
                () => {
                  setIsPublic(previous);
                  setShowcaseSwipeOptIn(previousSwipe);
                  setIsStoryPublic(previousStory);
                },
              );
            }}
          />
        </div>
        <div id="build-swipe" className="scroll-mt-24">
          <VehicleIosSettingsToggleRow
            label="Im Build-Swipe zeigen"
            sublabel="Nur öffentliche Showcase-Inhalte — keine Belege oder VIN"
            checked={showcaseSwipeOptIn}
            disabled={!canEdit || !isPublic || pending}
            onCheckedChange={(value) => {
              const previous = showcaseSwipeOptIn;
              setShowcaseSwipeOptIn(value);
              saveSettings({ showcaseSwipeOptIn: value }, () =>
                setShowcaseSwipeOptIn(previous),
              );
            }}
          />
        </div>
        <VehicleIosSettingsToggleRow
          label="Build-Story öffentlich"
          sublabel="Chronologische Timeline für Profil- und QR-Besucher"
          checked={isStoryPublic}
          disabled={!canEdit || !isPublic || pending}
          onCheckedChange={(value) => {
            const previous = isStoryPublic;
            setIsStoryPublic(value);
            saveSettings({ isStoryPublic: value }, () =>
              setIsStoryPublic(previous),
            );
          }}
        />
        {showLikesRow ? (
          <IOSListItem
            label="Build-Swipe Likes"
            sublabel={`${showcaseSwipeTotalLikes} gesamt${
              showcaseSwipeUnreadLikes > 0
                ? ` · ${showcaseSwipeUnreadLikes} neu`
                : ""
            }`}
            showChevron={false}
          />
        ) : null}
        <VehicleIosSettingsToggleRow
          label="Preise ausblenden"
          sublabel="Beträge auf der öffentlichen Seite verbergen"
          checked={hideFinancials}
          disabled={!canEdit || pending}
          isLast
          onCheckedChange={(value) => {
            const previous = hideFinancials;
            setHideFinancials(value);
            saveSettings({ hideFinancials: value }, () =>
              setHideFinancials(previous),
            );
          }}
        />
      </IOSGroupedList>

      <IOSGroupedList headerTitle="Share-Link">
        {isPublic && shareUrl ? (
          <IOSListItem
            label="Dein Link"
            sublabel={shareUrl.replace(/^https?:\/\//, "")}
            showChevron={false}
            isLast
            trailing={
              <PressableButton
                type="button"
                variant="button"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-[13px] font-medium text-white"
                onClick={copyShareLink}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Kopieren
              </PressableButton>
            }
          />
        ) : (
          <IOSListItem
            label="Share-Link"
            sublabel={
              hasLinkedTag
                ? "Verfügbar, sobald das Profil öffentlich ist."
                : "Mit öffentlichem Showcase für Bio & Social."
            }
            showChevron={false}
            isLast
            trailing={
              !hasLinkedTag && tagShopUrl ? (
                <Link
                  href={tagShopUrl}
                  className="shrink-0 text-[13px] font-medium text-[#0A84FF]"
                >
                  Tag bestellen
                </Link>
              ) : undefined
            }
          />
        )}
      </IOSGroupedList>

      {message ? (
        <p className="px-4 text-[13px] text-[#30D158]">{message}</p>
      ) : null}
      {error ? (
        <p className="px-4 text-[13px] text-[#FF453A]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
