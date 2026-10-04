"use client";

import { useCallback, useState } from "react";
import { Share2 } from "lucide-react";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { buildAppInviteSharePayloadForClient } from "@/lib/share/app-invite";
import { showSavedToast } from "@/lib/ui/saved-toast";
import { cn } from "@/lib/utils";

type ShowcaseInviteFriendsProps = {
  className?: string;
};

export function ShowcaseInviteFriends({ className }: ShowcaseInviteFriendsProps) {
  const [error, setError] = useState<string | null>(null);

  const shareInvite = useCallback(async () => {
    setError(null);
    const payload = buildAppInviteSharePayloadForClient();
    const shareText = `${payload.text}\n${payload.url}`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
        });
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      showSavedToast("Einladungslink kopiert");
    } catch {
      setError("Teilen nicht möglich — Link konnte nicht kopiert werden.");
    }
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 zt-feature-panel px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[0.88rem] font-semibold text-[color:var(--vd-text)]">
          Freunde einladen
        </p>
        <p className="mt-0.5 text-[0.78rem] leading-relaxed text-[color:var(--vd-muted)]">
          Teile ZeloxTag — deine Freunde können sich anmelden und selbst Builds
          swipen und anlegen.
        </p>
      </div>
      <PressableButton
        type="button"
        variant="button"
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[color:var(--vd-text)] px-4 py-2.5 text-[0.85rem] font-semibold text-[color:var(--vd-bg)] shadow-[var(--vd-shadow-sm)]"
        onClick={() => void shareInvite()}
      >
        <Share2 className="h-4 w-4" aria-hidden />
        Teilen
      </PressableButton>
      {error ? (
        <p className="text-[0.78rem] font-medium text-red-600 sm:basis-full" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
