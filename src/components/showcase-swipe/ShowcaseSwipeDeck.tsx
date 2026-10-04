"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, X } from "lucide-react";

import { ShowcaseSwipeStack } from "@/components/showcase-swipe/showcase-swipe-stack";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";
import { cn } from "@/lib/utils";

type ShowcaseSwipeDeckProps = {
  tagUuid: string;
  initialCards?: ShowcaseSwipeCard[];
  onLiked?: (card: ShowcaseSwipeCard) => void;
};

async function fetchDeck(): Promise<ShowcaseSwipeCard[]> {
  const response = await fetch("/api/showcase/swipe/deck", {
    credentials: "same-origin",
  });
  const json = (await response.json()) as {
    ok?: boolean;
    cards?: ShowcaseSwipeCard[];
  };
  if (!response.ok || !json.ok || !Array.isArray(json.cards)) {
    throw new Error("deck_load_failed");
  }
  return json.cards;
}

async function postSwipe(
  publicSlug: string,
  decision: "like" | "pass",
): Promise<void> {
  const response = await fetch("/api/showcase/swipe", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicSlug, decision }),
  });
  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(json?.error ?? "swipe_failed");
  }
}

export function ShowcaseSwipeDeck({
  tagUuid,
  initialCards = [],
  onLiked,
}: ShowcaseSwipeDeckProps) {
  const router = useRouter();
  const [cards, setCards] = useState<ShowcaseSwipeCard[]>(initialCards);
  const [loading, setLoading] = useState(initialCards.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialCards.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const deck = await fetchDeck();
        if (!cancelled) setCards(deck);
      } catch {
        if (!cancelled) setError("Builds konnten nicht geladen werden.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCards.length]);

  const current = cards[0];

  const removeTop = useCallback(() => {
    setCards((prev) => prev.slice(1));
  }, []);

  const handleSwipe = useCallback(
    async (decision: "like" | "pass") => {
      if (!current || busy) return;
      setBusy(true);
      try {
        await postSwipe(current.publicSlug, decision);
        if (decision === "like") {
          onLiked?.(current);
        }
      } catch {
        setError("Swipe konnte nicht gespeichert werden.");
      } finally {
        removeTop();
        setBusy(false);
      }
    },
    [busy, current, onLiked, removeTop],
  );

  const openShowcase = useCallback(() => {
    if (!current) return;
    router.push(`/v/${current.publicSlug}`);
  }, [current, router]);

  if (loading) {
    return (
      <p className="text-center text-[0.9rem] text-[color:var(--vd-muted)]">
        Lade Builds…
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-center text-[0.9rem] text-red-600" role="alert">
        {error}
      </p>
    );
  }

  if (!current) {
    return (
      <div className="rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-5 py-10 text-center">
        <p className="text-[0.95rem] font-medium text-[color:var(--vd-text)]">
          Du hast alles gesehen
        </p>
        <button
          type="button"
          className="mt-6 text-[0.85rem] font-medium text-[color:var(--vd-accent)]"
          onClick={() => router.push(`/v/${tagUuid}`)}
        >
          Zurück zum Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[min(100%,300px)]">
        <ShowcaseSwipeStack
          cards={cards}
          disabled={busy}
          onSwipe={handleSwipe}
          onOpen={openShowcase}
        />
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          disabled={busy}
          aria-label="Pass"
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-rose-500 shadow-[var(--vd-shadow-sm)] disabled:opacity-50",
          )}
          onClick={() => handleSwipe("pass")}
        >
          <X className="h-7 w-7" strokeWidth={2} />
        </button>
        <button
          type="button"
          disabled={busy}
          aria-label="Like"
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-[color:var(--vd-surface)] text-emerald-600 shadow-[var(--vd-shadow-sm)] disabled:opacity-50",
          )}
          onClick={() => handleSwipe("like")}
        >
          <Heart className="h-8 w-8" strokeWidth={2} />
        </button>
      </div>

      <p className="text-center text-[0.78rem] text-[color:var(--vd-muted)]">
        Nach links wischen = Pass · Nach rechts = Like · Tippen = Showcase
      </p>
    </div>
  );
}
