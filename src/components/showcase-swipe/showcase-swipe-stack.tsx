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

const SWIPE_THRESHOLD = 100;
const MAX_VISIBLE = 4;
const ANIMATION = { stiffness: 260, damping: 20 };

type StackItem = {
  id: string;
  card: ShowcaseSwipeCard;
};

type CardRotateProps = {
  children: ReactNode;
  disabled: boolean;
  onDragEnd: (info: PanInfo) => void;
};

function CardRotate({ children, disabled, onDragEnd }: CardRotateProps) {
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
      <motion.div className="card-rotate-disabled" style={{ x: 0, y: 0 }}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="card-rotate"
      style={{ x, y, rotateX, rotateY }}
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.55}
      whileTap={{ cursor: "grabbing" }}
      onDragEnd={handleDragEnd}
    >
      {children}
    </motion.div>
  );
}

type ShowcaseSwipeStackProps = {
  cards: ShowcaseSwipeCard[];
  sensitivity?: number;
  disabled?: boolean;
  onSwipe: (decision: "like" | "pass") => void;
  onOpen: () => void;
};

function resolveSwipeDecision(
  offset: PanInfo["offset"],
  sensitivity: number,
): "like" | "pass" | null {
  const { x, y } = offset;
  if (x > SWIPE_THRESHOLD) return "like";
  if (x < -SWIPE_THRESHOLD) return "pass";
  if (Math.abs(x) > sensitivity && Math.abs(x) >= Math.abs(y)) {
    return x > 0 ? "like" : "pass";
  }
  return null;
}

export function ShowcaseSwipeStack({
  cards,
  sensitivity = 140,
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
      const decision = resolveSwipeDecision(info.offset, sensitivity);
      if (decision) {
        onSwipe(decision);
      }
    },
    [disabled, onSwipe, sensitivity],
  );

  if (stack.length === 0) return null;

  return (
    <div className="showcase-swipe-stack">
      {stack.map((item, index) => {
        const isTop = index === stack.length - 1;
        const depth = stack.length - index - 1;

        return (
          <CardRotate
            key={item.id}
            disabled={!isTop || disabled}
            onDragEnd={isTop ? handleTopDragEnd : () => {}}
          >
            <motion.div
              className="stack-card"
              animate={{
                rotateZ: depth * 4,
                scale: 1 + index * 0.06 - stack.length * 0.06,
                transformOrigin: "90% 90%",
              }}
              initial={false}
              transition={{
                type: "spring",
                stiffness: ANIMATION.stiffness,
                damping: ANIMATION.damping,
              }}
            >
              {isTop ? (
                <button
                  type="button"
                  className="h-full w-full text-left"
                  onClick={onOpen}
                >
                  <ShowcaseSwipeQuartettCard card={item.card} />
                </button>
              ) : (
                <ShowcaseSwipeQuartettCard card={item.card} />
              )}
            </motion.div>
          </CardRotate>
        );
      })}
    </div>
  );
}
