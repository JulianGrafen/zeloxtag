"use client";

import { useRef } from "react";
import { motion, useInView, type Variants } from "framer-motion";

import { cn } from "@/lib/utils";

import { useShowroomMotion } from "./showroom-motion";
import { SHOWCASE_QUARTETT_SEGMENT_COUNT } from "./showcase-quartett-scales";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Slanted Quartett-style parallelogram per segment. */
const segmentShape =
  "h-[10px] min-w-0 flex-1 origin-left [clip-path:polygon(16%_0,100%_0,84%_100%,0_100%)]";

const segmentContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.02,
    },
  },
};

const segmentItem: Variants = {
  hidden: { scaleX: 0, opacity: 0.35 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: { duration: 0.28, ease: EASE_OUT },
  },
};

type ShowroomQuartettBarProps = {
  filled: number;
  total?: number;
  className?: string;
};

export function ShowroomQuartettBar({
  filled,
  total = SHOWCASE_QUARTETT_SEGMENT_COUNT,
  className,
}: ShowroomQuartettBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const { reduceMotion } = useShowroomMotion();

  const clampedFilled = Math.min(total, Math.max(0, filled));

  return (
    <motion.div
      ref={ref}
      className={cn("flex w-full gap-[3px] px-0.5", className)}
      role="img"
      aria-hidden
      variants={reduceMotion ? undefined : segmentContainer}
      initial={reduceMotion ? undefined : "hidden"}
      animate={reduceMotion ? undefined : inView ? "visible" : "hidden"}
    >
      {Array.from({ length: total }, (_, index) => {
        const isActive = index < clampedFilled;

        if (!isActive) {
          return (
            <div key={index} className={cn(segmentShape, "bg-white/12")} />
          );
        }

        if (reduceMotion) {
          return <div key={index} className={cn(segmentShape, "bg-white")} />;
        }

        return (
          <motion.div
            key={index}
            variants={segmentItem}
            className={cn(segmentShape, "bg-white")}
          />
        );
      })}
    </motion.div>
  );
}
