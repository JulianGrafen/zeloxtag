"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { PublicSwipeConversionGate } from "@/components/public-swipe/public-swipe-conversion-gate";
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
import { Button } from "@/components/ui/button";
import { useAnonymousSwipe } from "@/hooks/useAnonymousSwipe";
import { apiFetch } from "@/lib/api/api-fetch";
import { usePlatformServices } from "@/services/platform/context/platform-services-context";
import { preloadImageHrefs } from "@/lib/image/preload-image-hrefs";
import { ANONYMOUS_SWIPE_GATE_LIMIT } from "@/lib/public-swipe/anonymous-swipe-storage";
import {
  buildDiscoverShowcaseHref,
  isNavigableShowcasePublicSlug,
  PUBLIC_SWIPE_DISCOVER_BACK_HREF,
} from "@/lib/showcase/discover-showcase-navigation";
import {
  mapPublicSwipeCardList,
  publicSwipeCardToShowcaseCard,
  type PublicSwipeCard,
} from "@/lib/public-swipe/public-swipe-card-map";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";
import { cn } from "@/lib/utils";

type GateReason = "limit" | "upload" | null;

type SwipeFeedback = {
  cleanScorePercent: number | null;
};

export function PublicSwipeExperience() {
  const router = useRouter();
  const {
    sessionReady,
    sessionHash,
    calendarWeekKey,
    swipedCarIds,
    swipeCount,
    isGated,
    recordSwipe,
  } = useAnonymousSwipe();
  const { nativeBridge } = usePlatformServices();
  const [cards, setCards] = useState<PublicSwipeCard[]>([]);
  const [hydrating, setHydrating] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [swipeError, setSwipeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hadCardsThisSession, setHadCardsThisSession] = useState(false);
  const [gateReason, setGateReason] = useState<GateReason>(null);
  const [feedback, setFeedback] = useState<SwipeFeedback | null>(null);
  const stackRef = useRef<ShowcaseSwipeStackHandle>(null);

  const gateOpen = gateReason != null || isGated;
  const excludeKey = useMemo(
    () => `${calendarWeekKey}:${swipedCarIds.join(",")}`,
    [calendarWeekKey, swipedCarIds],
  );

  const showcaseCards = useMemo(
    () => cards.map(publicSwipeCardToShowcaseCard),
    [cards],
  );

  const current = cards[0] ?? null;

  const loadDeck = useCallback(async () => {
    setHydrating(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ limit: "10" });
      if (swipedCarIds.length > 0) {
        params.set("excludeIds", swipedCarIds.join(","));
      }
      if (sessionHash) {
        params.set("sessionHash", sessionHash);
      }
      const response = await apiFetch(
        `/api/public/swipe/cards?${params.toString()}`,
      );
      const body = (await response.json()) as {
        ok?: boolean;
        cards?: unknown;
        error?: string;
      };
      if (!response.ok || !body.ok) {
        setCards([]);
        setLoadError(body.error ?? "Builds konnten nicht geladen werden.");
        return;
      }
      const deck = mapPublicSwipeCardList(body.cards);
      setCards(deck);
      setHadCardsThisSession(deck.length > 0);
    } catch (error) {
      console.error("[public-swipe] deck load failed", error);
      setCards([]);
      setLoadError("Builds konnten nicht geladen werden.");
    } finally {
      setHydrating(false);
    }
  }, [sessionHash, swipedCarIds]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadDeck();
  }, [sessionReady, excludeKey, loadDeck]);

  useEffect(() => {
    if (isGated && gateReason == null) {
      setGateReason("limit");
    }
  }, [isGated, gateReason]);

  useEffect(() => {
    preloadImageHrefs(
      showcaseCards.slice(0, 5).map((card) => card.heroImageSrc),
    );
  }, [showcaseCards]);

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
      if (!current || busy || gateOpen) return;
      if (swipeCount >= ANONYMOUS_SWIPE_GATE_LIMIT) {
        setGateReason("limit");
        stackRef.current?.resetTop();
        return;
      }

      setBusy(true);
      const swiped = current;
      const vote = decision === "like" ? "up" : "down";
      removeTop();
      void nativeBridge.triggerHaptic("light");

      const result = await recordSwipe(swiped.id, vote);
      if (!result) {
        setSwipeError("Swipe konnte nicht gespeichert werden.");
        void loadDeck();
        setBusy(false);
        return;
      }

      const cleanScorePercent =
        result.cleanScorePercent ?? swiped.cleanScorePercent;

      setFeedback({ cleanScorePercent });
      window.setTimeout(() => setFeedback(null), 520);
      setSwipeError(null);

      if (swipeCount + 1 >= ANONYMOUS_SWIPE_GATE_LIMIT) {
        setGateReason("limit");
      }
      setBusy(false);
    },
    [
      busy,
      current,
      gateOpen,
      loadDeck,
      nativeBridge,
      recordSwipe,
      removeTop,
      swipeCount,
    ],
  );

  const openGate = useCallback((reason: GateReason) => {
    setGateReason(reason);
  }, []);

  const openFromCard = useCallback(
    (card: ShowcaseSwipeCard) => {
      if (isGated || swipeCount >= ANONYMOUS_SWIPE_GATE_LIMIT) {
        setGateReason("limit");
        return;
      }
      if (!isNavigableShowcasePublicSlug(card.publicSlug)) {
        console.warn(
          "[public-swipe] showcase slug missing or vehicle UUID — reload deck",
        );
        return;
      }
      router.push(
        buildDiscoverShowcaseHref(
          card.publicSlug,
          PUBLIC_SWIPE_DISCOVER_BACK_HREF,
        ),
      );
    },
    [isGated, router, swipeCount],
  );

  const deckBody = (() => {
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
              onClick={() => void loadDeck()}
            >
              Erneut laden
            </button>
          </div>
        );
      }

      if (!hadCardsThisSession) {
        const weekExhausted =
          swipedCarIds.length > 0 || swipeCount > 0 || isGated;
        if (weekExhausted) {
          return (
            <div className={discoverEmptyPanelClassName}>
              <p className={discoverEmptyTitleClassName}>
                Diese Woche durchgeswiped
              </p>
              <p className={discoverEmptyBodyClassName}>
                Montag kommen bekannte Builds wieder ins Deck. Bis dahin kannst
                du dein eigenes Projektauto hochladen.
              </p>
              <button
                type="button"
                className={discoverEmptyActionClassName}
                onClick={() => openGate("upload")}
              >
                Eigenes Auto hochladen
              </button>
            </div>
          );
        }
        return (
          <div className={discoverEmptyPanelClassName}>
            <p className={discoverEmptyTitleClassName}>
              Aktuell keine öffentlichen Builds
            </p>
            <p className={discoverEmptyBodyClassName}>
              Builds erscheinen hier, wenn Halter ihr Showcase veröffentlichen,
              ein Fahrzeugbild haben und „Im Build-Swipe zeigen“ aktivieren.
            </p>
            <button
              type="button"
              className={discoverEmptyActionClassName}
              onClick={() => void loadDeck()}
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
            Lade dein Projektauto hoch und werde Teil der Community.
          </p>
          <button
            type="button"
            className="text-[0.8rem] font-medium text-white/85"
            onClick={() => openGate("upload")}
          >
            Eigenes Auto hochladen
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
            cards={showcaseCards}
            disabled={busy || gateOpen}
            onSwipe={handleSwipe}
            onOpen={openFromCard}
          />
          {feedback ? (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
              <p className="rounded-2xl border border-white/20 bg-black/70 px-5 py-3 text-lg font-bold text-white backdrop-blur-md">
                {feedback.cleanScorePercent != null
                  ? `🔥 ${feedback.cleanScorePercent} % Clean`
                  : "Swipe gespeichert"}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  })();

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-label="Builds swipen"
        className={cn("relative pb-2", gateOpen && "pb-0")}
      >
        <div
          className={cn(
            gateOpen && "pointer-events-none select-none blur-md transition-[filter]",
          )}
        >
          {deckBody}
        </div>
      </section>

      <Button
        type="button"
        variant="ghost"
        className="min-h-11 w-full rounded-full border border-white/10 bg-zinc-900/50 text-white hover:bg-zinc-900"
        onClick={() => openGate("upload")}
      >
        Eigenes Auto hochladen
      </Button>

      <PublicSwipeConversionGate
        open={gateOpen}
        onClose={gateReason === "limit" ? undefined : () => setGateReason(null)}
      />
    </div>
  );
}
