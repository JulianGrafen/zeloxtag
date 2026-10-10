"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, X } from "lucide-react";

import {
  ShowcaseSwipeStack,
  type ShowcaseSwipeStackHandle,
} from "@/components/showcase-swipe/showcase-swipe-stack";
import { preloadImageHrefs } from "@/lib/image/preload-image-hrefs";
import { buildDiscoverShowcaseHref } from "@/lib/showcase/discover-showcase-navigation";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";
import { cn } from "@/lib/utils";

type ShowcaseSwipeDeckProps = {
  tagUuid: string;
  entdeckenReturnHref: string;
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
  entdeckenReturnHref,
  initialCards = [],
  onLiked,
}: ShowcaseSwipeDeckProps) {
  const router = useRouter();
  const [cards, setCards] = useState<ShowcaseSwipeCard[]>(initialCards);
  const [hydrating, setHydrating] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [swipeError, setSwipeError] = useState<string | null>(null);
  /** True only after a non-empty client deck load or a swipe — not from SSR preload alone. */
  const [hadCardsThisSession, setHadCardsThisSession] = useState(false);
  const [busy, setBusy] = useState(false);
  const stackRef = useRef<ShowcaseSwipeStackHandle>(null);
  const [highlightedAction, setHighlightedAction] = useState<
    "like" | "pass" | null
  >(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashActionButton = useCallback((decision: "like" | "pass") => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    setHighlightedAction(decision);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedAction(null);
      highlightTimerRef.current = null;
    }, 520);
  }, []);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const reloadDeck = useCallback(async () => {
    setHydrating(true);
    setLoadError(null);
    try {
      const deck = await fetchDeck();
      setCards(deck);
      setHadCardsThisSession(deck.length > 0);
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
        setHadCardsThisSession(deck.length > 0);
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

  useEffect(() => {
    preloadImageHrefs(cards.slice(0, 5).map((card) => card.heroImageSrc));
  }, [cards]);

  const current = cards[0];

  const removeTop = useCallback(() => {
    setCards((prev) => {
      if (prev.length > 0) {
        setHadCardsThisSession(true);
      }
      return prev.slice(1);
    });
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
        stackRef.current?.resetTop();
      } finally {
        setBusy(false);
      }
    },
    [busy, current, onLiked, removeTop],
  );

  const openShowcase = useCallback(
    (card: ShowcaseSwipeCard) => {
      router.push(
        buildDiscoverShowcaseHref(card.publicSlug, entdeckenReturnHref),
      );
    },
    [entdeckenReturnHref, router],
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

    if (!hadCardsThisSession) {
      return (
        <div className="zt-feature-panel px-5 py-10 text-center">
          <p className="text-[0.95rem] font-medium text-[color:var(--vd-text)]">
            Aktuell keine öffentlichen Builds
          </p>
          <p className="mt-2 text-[0.85rem] text-[color:var(--vd-muted)]">
            Sobald andere Fahrzeuge im Showcase sichtbar sind, kannst du hier
            swipen und liken.
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
          ref={stackRef}
          cards={cards}
          disabled={busy}
          onSwipe={handleSwipe}
          onDecisionHighlight={flashActionButton}
          onOpen={openShowcase}
        />
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          disabled={busy}
          aria-label="Pass"
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-rose-500 shadow-[var(--vd-shadow-sm)] transition-all duration-300 disabled:opacity-50",
            highlightedAction === "pass" &&
              "scale-110 border-rose-400 bg-rose-500/20 text-rose-600 shadow-[0_0_28px_rgba(244,63,94,0.45)] ring-[3px] ring-rose-400/60",
          )}
          onClick={() => stackRef.current?.swipeTop("pass")}
        >
          <X className="h-7 w-7" strokeWidth={2} />
        </button>
        <button
          type="button"
          disabled={busy}
          aria-label="Like"
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-[color:var(--vd-surface)] text-emerald-600 shadow-[var(--vd-shadow-sm)] transition-all duration-300 disabled:opacity-50",
            highlightedAction === "like" &&
              "scale-110 border-emerald-400 bg-emerald-500/20 text-emerald-700 shadow-[0_0_32px_rgba(16,185,129,0.45)] ring-[3px] ring-emerald-400/65",
          )}
          onClick={() => stackRef.current?.swipeTop("like")}
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
