"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShowcaseSwipeStack,
  type ShowcaseSwipeStackHandle,
} from "@/components/showcase-swipe/showcase-swipe-stack";
import { preloadImageHrefs } from "@/lib/image/preload-image-hrefs";
import { buildDiscoverShowcaseHref } from "@/lib/showcase/discover-showcase-navigation";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";

type ShowcaseSwipeDeckProps = {
  tagUuid: string;
  entdeckenReturnHref: string;
  initialCards?: ShowcaseSwipeCard[];
  onLiked?: (card: ShowcaseSwipeCard) => void;
  /** Fired once when the user swiped through all cards in this session. */
  onDeckExhausted?: () => void;
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
  onDeckExhausted,
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
  const deckExhaustedNotifiedRef = useRef(false);

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

  const deckExhausted =
    !hydrating && !current && !loadError && hadCardsThisSession;

  useEffect(() => {
    if (!deckExhausted || deckExhaustedNotifiedRef.current) return;
    deckExhaustedNotifiedRef.current = true;
    onDeckExhausted?.();
  }, [deckExhausted, onDeckExhausted]);

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
      <div
        className="mx-auto aspect-[9/16] w-full max-h-[min(72vh,640px)] max-w-full animate-pulse rounded-3xl bg-[color:var(--vd-surface-elevated)]"
        aria-busy="true"
        aria-label="Builds werden geladen"
      />
    );
  }

  if (!current) {
    if (loadError) {
      return (
        <div className="rounded-2xl border border-[color:var(--vd-border)] px-5 py-10 text-center">
          <p className="text-[0.95rem] font-medium text-[color:var(--vd-text)]">
            {loadError}
          </p>
          <button
            type="button"
            className="mt-5 text-[0.85rem] font-semibold text-[color:var(--vd-accent)]"
            onClick={() => void reloadDeck()}
          >
            Erneut laden
          </button>
        </div>
      );
    }

    if (!hadCardsThisSession) {
      return (
        <div className="rounded-2xl border border-[color:var(--vd-border)] px-5 py-10 text-center">
          <p className="text-[0.95rem] font-medium text-[color:var(--vd-text)]">
            Aktuell keine öffentlichen Builds
          </p>
          <p className="mt-2 text-[0.82rem] text-[color:var(--vd-muted)]">
            Sobald andere Showcases live sind, kannst du hier swipen.
          </p>
          <button
            type="button"
            className="mt-5 text-[0.85rem] font-semibold text-[color:var(--vd-accent)]"
            onClick={() => void reloadDeck()}
          >
            Erneut laden
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-2 py-1 text-center" role="status">
        <p className="text-[0.88rem] font-medium text-[color:var(--vd-text)]">
          Alle Builds geswiped
        </p>
        <p className="text-[0.78rem] text-[color:var(--vd-muted)]">
          Rankings und Top der Woche siehst du jetzt direkt darunter.
        </p>
        <button
          type="button"
          className="text-[0.8rem] font-medium text-[color:var(--vd-accent)]"
          onClick={() => router.push(`/v/${tagUuid}`)}
        >
          Zum Dashboard
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
      <div
        className="relative mx-auto aspect-[9/16] w-full max-h-[min(72vh,640px)] max-w-full"
      >
        <ShowcaseSwipeStack
          ref={stackRef}
          cards={cards}
          disabled={busy}
          onSwipe={handleSwipe}
          onOpen={openShowcase}
        />
      </div>

      <p className="text-center text-[0.75rem] leading-relaxed text-[color:var(--vd-muted)]">
        Wischen oder Like/Pass auf der Karte · Showcase nur über „Showcase
        ansehen“
      </p>
    </div>
  );
}
