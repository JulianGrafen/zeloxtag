"use client";

import { useCallback, useState } from "react";
import { Share2 } from "lucide-react";

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
        "flex flex-col gap-2 border-t border-[color:var(--vd-border)] pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        className,
      )}
    >
      <p className="min-w-0 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
        <span className="font-medium text-[color:var(--vd-text)]">
          Freunde einladen
        </span>
        {" — "}
        Teile ZeloxTag, damit andere Builds swipen und anlegen können.
      </p>
      <button
        type="button"
        className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-[color:var(--vd-border)] bg-transparent px-3.5 py-2.5 text-[0.85rem] font-semibold text-[color:var(--vd-text)] transition-colors hover:bg-[color:var(--vd-surface-elevated)]"
        onClick={() => void shareInvite()}
      >
        <Share2 className="h-4 w-4" aria-hidden />
        Teilen
      </button>
      {error ? (
        <p className="text-[0.78rem] font-medium text-red-600 sm:basis-full" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
