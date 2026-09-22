"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { Heart, X } from "lucide-react";

import { ShowcaseSwipeQuartettCard } from "@/components/showcase-swipe/ShowcaseSwipeQuartettCard";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 120;

type ShowcaseSwipeDeckProps = {
  tagUuid: string;
  initialCards?: ShowcaseSwipeCard[];
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

function SwipeCard({
  card,
  active,
  onSwipe,
  onOpen,
}: {
  card: ShowcaseSwipeCard;
  active: boolean;
  onSwipe: (decision: "like" | "pass") => void;
  onOpen: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const likeOpacity = useTransform(x, [40, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -40], [1, 0]);

  const commitSwipe = useCallback(
    (decision: "like" | "pass", offsetX: number) => {
      const target = decision === "like" ? 420 : -420;
      animate(x, target, {
        duration: 0.22,
        onComplete: () => onSwipe(decision),
      });
      if (offsetX !== target) {
        x.set(offsetX);
      }
    },
    [onSwipe, x],
  );

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      commitSwipe("like", info.offset.x);
      return;
    }
    if (info.offset.x < -SWIPE_THRESHOLD) {
      commitSwipe("pass", info.offset.x);
      return;
    }
    animate(x, 0, { duration: 0.2 });
  };

  if (!active) {
    return (
      <div className="absolute inset-0 scale-[0.96] opacity-60">
        <ShowcaseSwipeQuartettCard card={card} />
      </div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 touch-none"
      style={{ x, rotate, zIndex: 20 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={onDragEnd}
    >
      <motion.div
        className="pointer-events-none absolute left-4 top-4 z-10 rounded-xl border-2 border-emerald-400 px-3 py-1 text-sm font-bold uppercase tracking-wide text-emerald-400"
        style={{ opacity: likeOpacity }}
      >
        Like
      </motion.div>
      <motion.div
        className="pointer-events-none absolute right-4 top-4 z-10 rounded-xl border-2 border-rose-400 px-3 py-1 text-sm font-bold uppercase tracking-wide text-rose-400"
        style={{ opacity: passOpacity }}
      >
        Pass
      </motion.div>
      <button
        type="button"
        className="h-full w-full text-left"
        onClick={onOpen}
      >
        <ShowcaseSwipeQuartettCard card={card} />
      </button>
    </motion.div>
  );
}

export function ShowcaseSwipeDeck({
  tagUuid,
  initialCards = [],
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
  const next = cards[1];

  const removeTop = useCallback(() => {
    setCards((prev) => prev.slice(1));
  }, []);

  const handleSwipe = useCallback(
    async (decision: "like" | "pass") => {
      if (!current || busy) return;
      setBusy(true);
      try {
        await postSwipe(current.publicSlug, decision);
      } catch {
        setError("Swipe konnte nicht gespeichert werden.");
      } finally {
        removeTop();
        setBusy(false);
      }
    },
    [busy, current, removeTop],
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
        <p className="mt-2 text-[0.85rem] text-[color:var(--vd-muted)]">
          Schau später wieder vorbei — neue opt-in Builds kommen dazu.
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
      <div className="relative mx-auto h-[min(72vh,520px)] w-full max-w-sm">
        {next ? (
          <SwipeCard
            card={next}
            active={false}
            onSwipe={() => {}}
            onOpen={() => {}}
          />
        ) : null}
        <SwipeCard
          card={current}
          active
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
            "flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 shadow-[var(--vd-shadow-sm)] disabled:opacity-50",
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
