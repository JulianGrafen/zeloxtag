"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "motion/react";

import { ShowcaseSwipeQuartettCard } from "@/components/showcase-swipe/ShowcaseSwipeQuartettCard";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";

import "./stack.css";

const SWIPE_OFFSET_PX = 48;
const SWIPE_VELOCITY_PX_S = 280;
const OPEN_TAP_MAX_OFFSET_PX = 10;
const OPEN_TAP_MAX_VELOCITY_PX_S = 160;
const DETAILS_TAP_MAX_MOVE_PX = 12;
const MAX_VISIBLE = 4;
const ANIMATION = { stiffness: 260, damping: 20 };

type StackItem = {
  id: string;
  card: ShowcaseSwipeCard;
};

type ShowcaseSwipeStackProps = {
  cards: ShowcaseSwipeCard[];
  disabled?: boolean;
  onSwipe: (decision: "like" | "pass") => void;
  onOpen: (card: ShowcaseSwipeCard) => void;
};

function resolveSwipeDecision(info: PanInfo): "like" | "pass" | null {
  const { x, y } = info.offset;
  const vx = info.velocity.x;
  const vy = info.velocity.y;

  const horizontalGesture =
    Math.abs(x) >= Math.abs(y) || Math.abs(vx) >= Math.abs(vy);

  if (!horizontalGesture) return null;

  if (x >= SWIPE_OFFSET_PX || vx >= SWIPE_VELOCITY_PX_S) return "like";
  if (x <= -SWIPE_OFFSET_PX || vx <= -SWIPE_VELOCITY_PX_S) return "pass";
  return null;
}

function isOpenTap(info: PanInfo): boolean {
  const { x, y } = info.offset;
  if (
    Math.abs(x) > OPEN_TAP_MAX_OFFSET_PX ||
    Math.abs(y) > OPEN_TAP_MAX_OFFSET_PX
  ) {
    return false;
  }
  return (
    Math.abs(info.velocity.x) < OPEN_TAP_MAX_VELOCITY_PX_S &&
    Math.abs(info.velocity.y) < OPEN_TAP_MAX_VELOCITY_PX_S
  );
}

type SwipeableTopCardProps = {
  card: ShowcaseSwipeCard;
  zIndex: number;
  depth: number;
  stackLength: number;
  disabled: boolean;
  onGestureEnd: (info: PanInfo, card: ShowcaseSwipeCard) => void;
  onOpen: (card: ShowcaseSwipeCard) => void;
};

function SwipeableTopCard({
  card,
  zIndex,
  depth,
  stackLength,
  disabled,
  onGestureEnd,
  onOpen,
}: SwipeableTopCardProps) {
  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const rotateY = useTransform(x, [-100, 100], [-18, 18]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      onGestureEnd(info, card);
      x.set(0);
    },
    [card, onGestureEnd, x],
  );

  const handleHeroPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      dragControls.start(event);
    },
    [disabled, dragControls],
  );

  const handleDetailsTap = useCallback(() => {
    if (disabled) return;
    onOpen(card);
  }, [card, disabled, onOpen]);

  return (
    <motion.div
      className="card-rotate"
      style={{ x, rotateY, zIndex }}
      drag="x"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.4}
      dragDirectionLock
      onDragEnd={handleDragEnd}
    >
      <motion.div
        className="stack-card"
        animate={{
          rotateZ: depth * 4,
          scale:
            1 + (stackLength - 1 - depth) * 0.06 - stackLength * 0.06,
          transformOrigin: "90% 90%",
        }}
        initial={false}
        transition={{
          type: "spring",
          stiffness: ANIMATION.stiffness,
          damping: ANIMATION.damping,
        }}
      >
        <ShowcaseSwipeQuartettCard
          card={card}
          className="select-none"
          interactive
          onHeroPointerDown={handleHeroPointerDown}
          onDetailsTap={handleDetailsTap}
          detailsTapMaxMovePx={DETAILS_TAP_MAX_MOVE_PX}
        />
      </motion.div>
    </motion.div>
  );
}

export function ShowcaseSwipeStack({
  cards,
  disabled = false,
  onSwipe,
  onOpen,
}: ShowcaseSwipeStackProps) {
  const visibleCards = useMemo(
    () => cards.slice(0, MAX_VISIBLE),
    [cards],
  );

  const [stack, setStack] = useState<StackItem[]>(() =>
    visibleCards.map((card) => ({ id: card.publicSlug, card })),
  );

  useEffect(() => {
    setStack(visibleCards.map((card) => ({ id: card.publicSlug, card })));
  }, [visibleCards]);

  const handleTopGestureEnd = useCallback(
    (info: PanInfo, card: ShowcaseSwipeCard) => {
      if (disabled) return;

      const decision = resolveSwipeDecision(info);
      if (decision) {
        onSwipe(decision);
        return;
      }

      if (isOpenTap(info)) {
        onOpen(card);
      }
    },
    [disabled, onOpen, onSwipe],
  );

  if (stack.length === 0) return null;

  return (
    <div className="showcase-swipe-stack">
      {stack.map((item, index) => {
        const isTop = index === 0;
        const depth = index;
        const layerZ = stack.length - index;

        if (isTop) {
          return (
            <SwipeableTopCard
              key={item.id}
              card={item.card}
              zIndex={layerZ}
              depth={depth}
              stackLength={stack.length}
              disabled={disabled}
              onGestureEnd={handleTopGestureEnd}
              onOpen={onOpen}
            />
          );
        }

        return (
          <div
            key={item.id}
            className="card-rotate-disabled"
            style={{ zIndex: layerZ }}
          >
            <motion.div
              className="stack-card"
              animate={{
                rotateZ: depth * 4,
                scale:
                  1 +
                  (stack.length - 1 - depth) * 0.06 -
                  stack.length * 0.06,
                transformOrigin: "90% 90%",
              }}
              initial={false}
              transition={{
                type: "spring",
                stiffness: ANIMATION.stiffness,
                damping: ANIMATION.damping,
              }}
            >
              <ShowcaseSwipeQuartettCard card={item.card} />
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
