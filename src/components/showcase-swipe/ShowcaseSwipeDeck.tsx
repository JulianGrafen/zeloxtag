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
  const [hydrating, setHydrating] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [swipeError, setSwipeError] = useState<string | null>(null);
  const [everHadCards, setEverHadCards] = useState(initialCards.length > 0);
  const [busy, setBusy] = useState(false);

  const reloadDeck = useCallback(async () => {
    setHydrating(true);
    setLoadError(null);
    try {
      const deck = await fetchDeck();
      setCards(deck);
      if (deck.length > 0) {
        setEverHadCards(true);
      }
    } catch {
      setLoadError("Builds konnten nicht geladen werden.");
    } finally {
      setHydrating(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const deck = await fetchDeck();
        if (cancelled) return;
        setCards(deck);
        if (deck.length > 0) {
          setEverHadCards(true);
        }
        setLoadError(null);
      } catch {
        if (!cancelled) {
          setLoadError("Builds konnten nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setHydrating(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        removeTop();
        setSwipeError(null);
      } catch {
        setSwipeError("Swipe konnte nicht gespeichert werden.");
      } finally {
        setBusy(false);
      }
    },
    [busy, current, onLiked, removeTop],
  );

  const openShowcase = useCallback(
    (card: ShowcaseSwipeCard) => {
      router.push(`/v/${card.publicSlug}`);
    },
    [router],
  );

  if (hydrating && !current) {
    return (
      <p className="text-center text-[0.9rem] text-[color:var(--vd-muted)]">
        Lade Builds…
      </p>
    );
  }

  if (!current) {
    if (loadError) {
      return (
        <div className="zt-feature-panel px-5 py-10 text-center">
          <p className="text-[0.95rem] font-medium text-[color:var(--vd-text)]">
            {loadError}
          </p>
          <button
            type="button"
            className="mt-6 text-[0.85rem] font-medium text-[color:var(--vd-accent)]"
            onClick={() => void reloadDeck()}
          >
            Erneut laden
          </button>
        </div>
      );
    }

    if (!everHadCards) {
      return (
        <div className="zt-feature-panel px-5 py-10 text-center">
          <p className="text-[0.95rem] font-medium text-[color:var(--vd-text)]">
            Aktuell keine Builds zum Swipen
          </p>
          <p className="mt-2 text-[0.85rem] text-[color:var(--vd-muted)]">
            Sobald andere Nutzer ihr Profil veröffentlichen und im Build-Swipe
            sichtbar sind, erscheinen sie hier.
          </p>
          <button
            type="button"
            className="mt-6 text-[0.85rem] font-medium text-[color:var(--vd-accent)]"
            onClick={() => void reloadDeck()}
          >
            Erneut laden
          </button>
        </div>
      );
    }

    return (
      <div className="zt-feature-panel px-5 py-10 text-center">
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
      {swipeError ? (
        <p className="text-center text-[0.9rem] text-red-600" role="alert">
          {swipeError}
        </p>
      ) : null}
      <div className="relative mx-auto aspect-[9/16] w-full max-w-full">
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
