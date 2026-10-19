"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  discoverDeckFrameClassName,
  discoverDeckSkeletonClassName,
  discoverEmptyActionClassName,
  discoverEmptyBodyClassName,
  discoverEmptyPanelClassName,
  discoverEmptyTitleClassName,
} from "@/components/showcase-swipe/discover-minimal/discover-surface-styles";
import {
  ShowcaseSwipeStack,
  type ShowcaseSwipeStackHandle,
} from "@/components/showcase-swipe/showcase-swipe-stack";
import { apiFetch } from "@/lib/api/api-fetch";
import { preloadImageHrefs } from "@/lib/image/preload-image-hrefs";
import {
  buildDiscoverShowcaseHref,
  isNavigableShowcasePublicSlug,
} from "@/lib/showcase/discover-showcase-navigation";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";

type ShowcaseSwipeDeckProps = {
  tagUuid: string;
  entdeckenReturnHref: string;
  initialCards?: ShowcaseSwipeCard[];
  /** Dev/preview: skip API, local swipe only (owner entdecken design). */
  designPreview?: boolean;
  onLiked?: (card: ShowcaseSwipeCard) => void;
  /** Fired once when the user swiped through all cards in this session. */
  onDeckExhausted?: () => void;
};

async function fetchDeck(): Promise<ShowcaseSwipeCard[]> {
  const response = await apiFetch("/api/showcase/swipe/deck");
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
  const response = await apiFetch("/api/showcase/swipe", {
    method: "POST",
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
  designPreview = false,
  onLiked,
  onDeckExhausted,
}: ShowcaseSwipeDeckProps) {
  const router = useRouter();
  const [cards, setCards] = useState<ShowcaseSwipeCard[]>(initialCards);
  const [hydrating, setHydrating] = useState(!designPreview);
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
    if (designPreview) {
      setHadCardsThisSession(initialCards.length > 0);
      return;
    }
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
  }, [designPreview, initialCards.length]);

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
        if (!designPreview) {
          await postSwipe(current.publicSlug, decision);
        }
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
    [busy, current, designPreview, onLiked, removeTop],
  );

  const openShowcase = useCallback(
    (card: ShowcaseSwipeCard) => {
      if (!isNavigableShowcasePublicSlug(card.publicSlug)) {
        console.warn(
          "[entdecken] showcase slug missing or vehicle UUID — reload deck",
        );
        return;
      }
      router.push(
        buildDiscoverShowcaseHref(card.publicSlug, entdeckenReturnHref),
      );
    },
    [entdeckenReturnHref, router],
  );

  if (hydrating && !current) {
    return (
      <div
        className={discoverDeckSkeletonClassName}
        aria-busy="true"
        aria-label="Builds werden geladen"
      />
    );
  }

  if (!current) {
    if (loadError) {
      return (
        <div className={discoverEmptyPanelClassName}>
          <p className={discoverEmptyTitleClassName}>{loadError}</p>
          <button
            type="button"
            className={discoverEmptyActionClassName}
            onClick={() => void reloadDeck()}
          >
            Erneut laden
          </button>
        </div>
      );
    }

    if (!hadCardsThisSession) {
      return (
        <div className={discoverEmptyPanelClassName}>
          <p className={discoverEmptyTitleClassName}>
            Aktuell keine öffentlichen Builds
          </p>
          <p className={discoverEmptyBodyClassName}>
            Sobald andere Showcases live sind, kannst du hier swipen.
          </p>
          <button
            type="button"
            className={discoverEmptyActionClassName}
            onClick={() => void reloadDeck()}
          >
            Erneut laden
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-2 py-1 text-center" role="status">
        <p className={discoverEmptyTitleClassName}>Alle Builds geswiped</p>
        <p className="text-[0.78rem] text-zinc-400">
          Rankings und Top der Woche siehst du jetzt direkt darunter.
        </p>
        <button
          type="button"
          className="text-[0.8rem] font-medium text-white/85"
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
        <p className="text-center text-[0.9rem] text-rose-400" role="alert">
          {swipeError}
        </p>
      ) : null}
      <div className={discoverDeckFrameClassName}>
        <ShowcaseSwipeStack
          ref={stackRef}
          cards={cards}
          disabled={busy}
          onSwipe={handleSwipe}
          onOpen={openShowcase}
        />
      </div>

    </div>
  );
}
