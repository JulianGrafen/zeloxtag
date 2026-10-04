"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "motion/react";

import { ShowcaseSwipeQuartettCard } from "@/components/showcase-swipe/ShowcaseSwipeQuartettCard";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";

import "./stack.css";

const SWIPE_OFFSET_PX = 56;
const SWIPE_VELOCITY_PX_S = 320;
const MAX_VISIBLE = 4;
const ANIMATION = { stiffness: 260, damping: 20 };

type StackItem = {
  id: string;
  card: ShowcaseSwipeCard;
};

type CardRotateProps = {
  children: ReactNode;
  disabled: boolean;
  zIndex: number;
  onDragEnd: (info: PanInfo) => void;
  onTap?: () => void;
};

function CardRotate({
  children,
  disabled,
  zIndex,
  onDragEnd,
  onTap,
}: CardRotateProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [18, -18]);
  const rotateY = useTransform(x, [-100, 100], [-18, 18]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      onDragEnd(info);
      x.set(0);
      y.set(0);
    },
    [onDragEnd, x, y],
  );

  if (disabled) {
    return (
      <motion.div
        className="card-rotate-disabled"
        style={{ x: 0, y: 0, zIndex }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="card-rotate"
      style={{ x, y, rotateX, rotateY, zIndex }}
      drag="x"
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.45}
      dragDirectionLock
      whileTap={{ cursor: "grabbing" }}
      onDragEnd={handleDragEnd}
      onTap={onTap}
    >
      {children}
    </motion.div>
  );
}

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

  const handleTopDragEnd = useCallback(
    (info: PanInfo) => {
      if (disabled) return;
      const decision = resolveSwipeDecision(info);
      if (decision) {
        onSwipe(decision);
      }
    },
    [disabled, onSwipe],
  );

  if (stack.length === 0) return null;

  return (
    <div className="showcase-swipe-stack">
      {stack.map((item, index) => {
        const isTop = index === 0;
        const depth = index;

        const layerZ = stack.length - index;

        return (
          <CardRotate
            key={item.id}
            zIndex={layerZ}
            disabled={!isTop || disabled}
            onDragEnd={isTop ? handleTopDragEnd : () => {}}
            onTap={
              isTop && !disabled
                ? () => {
                    onOpen(item.card);
                  }
                : undefined
            }
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
              <ShowcaseSwipeQuartettCard
                card={item.card}
                className={isTop ? "select-none" : undefined}
              />
            </motion.div>
          </CardRotate>
        );
      })}
    </div>
  );
}
