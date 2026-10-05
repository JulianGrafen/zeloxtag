"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
  type PanInfo,
} from "motion/react";

import { ShowcaseSwipeQuartettCard } from "@/components/showcase-swipe/ShowcaseSwipeQuartettCard";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";

import "./stack.css";

const SWIPE_OFFSET_PX = 56;
const SWIPE_VELOCITY_PX_S = 320;
const OPEN_TAP_MAX_OFFSET_PX = 12;
const OPEN_TAP_MAX_VELOCITY_PX_S = 180;
const EXIT_OFFSET_PX = 520;
const MAX_VISIBLE = 4;
const ANIMATION = { stiffness: 260, damping: 20 };
const SPRING_BACK = { type: "spring" as const, stiffness: 420, damping: 34 };
const SPRING_EXIT = { type: "spring" as const, stiffness: 320, damping: 28 };

type StackItem = {
  id: string;
  card: ShowcaseSwipeCard;
};

export type ShowcaseSwipeStackHandle = {
  swipeTop: (decision: "like" | "pass") => void;
  resetTop: () => void;
};

type SwipeableTopCardHandle = {
  flyOff: (decision: "like" | "pass") => Promise<void>;
  reset: () => void;
};

type SwipeableTopCardProps = {
  card: ShowcaseSwipeCard;
  zIndex: number;
  depth: number;
  stackLength: number;
  disabled: boolean;
  onSwipeComplete: (decision: "like" | "pass") => void;
  onDecisionHighlight?: (decision: "like" | "pass") => void;
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

async function springMotionValue(
  value: MotionValue<number>,
  target: number,
  transition: typeof SPRING_BACK | typeof SPRING_EXIT,
): Promise<void> {
  await animate(value, target, transition);
}

const SwipeableTopCard = forwardRef<SwipeableTopCardHandle, SwipeableTopCardProps>(
  function SwipeableTopCard(
    {
      card,
      zIndex,
      depth,
      stackLength,
      disabled,
      onSwipeComplete,
      onDecisionHighlight,
      onOpen,
    },
    ref,
  ) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [12, -12]);
    const rotateY = useTransform(x, [-120, 120], [-22, 22]);
    const likeOpacity = useTransform(x, [0, 80], [0, 1]);
    const passOpacity = useTransform(x, [-80, 0], [1, 0]);
    const [isExiting, setIsExiting] = useState(false);
    const exitingRef = useRef(false);
    const dragGestureRef = useRef(false);

    const reset = useCallback(() => {
      exitingRef.current = false;
      setIsExiting(false);
      void springMotionValue(x, 0, SPRING_BACK);
      void springMotionValue(y, 0, SPRING_BACK);
    }, [x, y]);

    const flyOff = useCallback(
      async (decision: "like" | "pass") => {
        if (exitingRef.current || disabled) return;
        exitingRef.current = true;
        setIsExiting(true);
        onDecisionHighlight?.(decision);
        const exitX = decision === "like" ? EXIT_OFFSET_PX : -EXIT_OFFSET_PX;
        await springMotionValue(x, exitX, SPRING_EXIT);
        await springMotionValue(y, 0, SPRING_BACK);
        onSwipeComplete(decision);
      },
      [disabled, onDecisionHighlight, onSwipeComplete, x, y],
    );

    useImperativeHandle(ref, () => ({ flyOff, reset }), [flyOff, reset]);

    const openShowcaseFromGesture = useCallback(() => {
      if (disabled || exitingRef.current) return;
      onOpen(card);
    }, [card, disabled, onOpen]);

    const handleDragStart = useCallback(() => {
      dragGestureRef.current = true;
    }, []);

    const handleDragEnd = useCallback(
      (_: unknown, info: PanInfo) => {
        if (disabled || exitingRef.current) return;

        const decision = resolveSwipeDecision(info);
        if (decision) {
          void flyOff(decision);
          dragGestureRef.current = false;
          return;
        }

        if (isOpenTap(info)) {
          openShowcaseFromGesture();
          dragGestureRef.current = false;
          void springMotionValue(x, 0, SPRING_BACK);
          void springMotionValue(y, 0, SPRING_BACK);
          return;
        }

        dragGestureRef.current = false;
        void springMotionValue(x, 0, SPRING_BACK);
        void springMotionValue(y, 0, SPRING_BACK);
      },
      [disabled, flyOff, openShowcaseFromGesture, x, y],
    );

    const handleTap = useCallback(() => {
      if (dragGestureRef.current) {
        dragGestureRef.current = false;
        return;
      }
      openShowcaseFromGesture();
    }, [openShowcaseFromGesture]);

    return (
      <motion.div
        className="card-rotate"
        style={{ x, y, rotateX, rotateY, zIndex, touchAction: "none" }}
        drag={disabled || isExiting ? false : "x"}
        dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
        dragElastic={0.5}
        dragDirectionLock
        dragMomentum={false}
        whileTap={{ cursor: "grabbing" }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
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
          <motion.div
            className="pointer-events-none absolute left-4 top-4 z-10 rounded-xl border-2 border-emerald-400/80 bg-emerald-500/15 px-3 py-1.5 text-[0.8rem] font-bold uppercase tracking-wide text-emerald-300"
            style={{ opacity: likeOpacity, rotate: -12 }}
            aria-hidden
          >
            Like
          </motion.div>
          <motion.div
            className="pointer-events-none absolute right-4 top-4 z-10 rounded-xl border-2 border-rose-400/80 bg-rose-500/15 px-3 py-1.5 text-[0.8rem] font-bold uppercase tracking-wide text-rose-300"
            style={{ opacity: passOpacity, rotate: 12 }}
            aria-hidden
          >
            Pass
          </motion.div>
          <ShowcaseSwipeQuartettCard
            card={card}
            className="select-none touch-none"
            imagePriority
          />
        </motion.div>
      </motion.div>
    );
  },
);

type StaticStackCardProps = {
  children: ReactNode;
  zIndex: number;
  depth: number;
  stackLength: number;
};

function StaticStackCard({
  children,
  zIndex,
  depth,
  stackLength,
}: StaticStackCardProps) {
  return (
    <div className="card-rotate-disabled" style={{ zIndex }}>
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
        {children}
      </motion.div>
    </div>
  );
}

type ShowcaseSwipeStackProps = {
  cards: ShowcaseSwipeCard[];
  disabled?: boolean;
  onSwipe: (decision: "like" | "pass") => void;
  onDecisionHighlight?: (decision: "like" | "pass") => void;
  onOpen: (card: ShowcaseSwipeCard) => void;
};

export const ShowcaseSwipeStack = forwardRef<
  ShowcaseSwipeStackHandle,
  ShowcaseSwipeStackProps
>(function ShowcaseSwipeStack(
  { cards, disabled = false, onSwipe, onDecisionHighlight, onOpen },
  ref,
) {
  const visibleCards = useMemo(
    () => cards.slice(0, MAX_VISIBLE),
    [cards],
  );

  const [stack, setStack] = useState<StackItem[]>(() =>
    visibleCards.map((card) => ({ id: card.publicSlug, card })),
  );

  const topCardRef = useRef<SwipeableTopCardHandle>(null);

  useEffect(() => {
    setStack(visibleCards.map((card) => ({ id: card.publicSlug, card })));
  }, [visibleCards]);

  useImperativeHandle(
    ref,
    () => ({
      swipeTop: (decision) => {
        void topCardRef.current?.flyOff(decision);
      },
      resetTop: () => {
        topCardRef.current?.reset();
      },
    }),
    [],
  );

  const handleSwipeComplete = useCallback(
    (decision: "like" | "pass") => {
      onSwipe(decision);
    },
    [onSwipe],
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
              ref={topCardRef}
              card={item.card}
              zIndex={layerZ}
              depth={depth}
              stackLength={stack.length}
              disabled={disabled}
              onSwipeComplete={handleSwipeComplete}
              onDecisionHighlight={onDecisionHighlight}
              onOpen={onOpen}
            />
          );
        }

        return (
          <StaticStackCard
            key={item.id}
            zIndex={layerZ}
            depth={depth}
            stackLength={stack.length}
          >
            <ShowcaseSwipeQuartettCard card={item.card} />
          </StaticStackCard>
        );
      })}
    </div>
  );
});
