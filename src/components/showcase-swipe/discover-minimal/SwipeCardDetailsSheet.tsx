"use client";

import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";

import { DiscoverBottomSheet } from "./DiscoverBottomSheet";
import { SwipeCardDetailsContent } from "./SwipeCardDetailsContent";

type SwipeCardDetailsSheetProps = {
  card: ShowcaseSwipeCard | null;
  onClose: () => void;
  onOpenShowcase: (card: ShowcaseSwipeCard) => void;
};

export function SwipeCardDetailsSheet({
  card,
  onClose,
  onOpenShowcase,
}: SwipeCardDetailsSheetProps) {
  const open = card != null;
  const title = card
    ? [card.make, card.model].filter(Boolean).join(" ") || card.make
    : undefined;

  return (
    <DiscoverBottomSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        card ? (
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-center rounded-full bg-white text-[0.88rem] font-semibold text-black transition active:scale-[0.99]"
            onClick={() => {
              onClose();
              onOpenShowcase(card);
            }}
          >
            Vollständigen Showcase öffnen
          </button>
        ) : null
      }
    >
      {card ? (
        <SwipeCardDetailsContent card={card} showVehicleHeader={false} />
      ) : null}
    </DiscoverBottomSheet>
  );
}
