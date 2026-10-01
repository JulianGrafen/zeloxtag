"use client";

import { motion } from "framer-motion";

import { SHOWCASE_QUARTETT_SEGMENT_CLIP } from "@/components/public-showcase/showcase-quartett-segment-bar";
import { SHOWCASE_QUARTETT_SEGMENT_COUNT } from "@/components/public-showcase/showcase-quartett-scales";
import { cn } from "@/lib/utils";

import { useClaimMotion } from "./claim-motion";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const CLAIM_QUARTETT_SEGMENT_CLASS = cn(
  "h-[8px] min-w-0 flex-1 origin-left",
  SHOWCASE_QUARTETT_SEGMENT_CLIP,
);

type ClaimPreviewQuartettBarProps = {
  filled: number;
  total?: number;
  className?: string;
};

export function ClaimPreviewQuartettBar({
  filled,
  total = SHOWCASE_QUARTETT_SEGMENT_COUNT,
  className,
}: ClaimPreviewQuartettBarProps) {
  const motionConfig = useClaimMotion();
  const clampedFilled = Math.min(total, Math.max(0, filled));

  if (motionConfig.reduceMotion) {
    return (
      <div
        className={cn("flex w-full gap-[3px] px-0.5", className)}
        role="img"
        aria-hidden
      >
        {Array.from({ length: total }, (_, index) => {
          const isActive = index < clampedFilled;
          return (
            <div
              key={index}
              className={cn(
                CLAIM_QUARTETT_SEGMENT_CLASS,
                isActive
                  ? "bg-[color:var(--vd-text)]"
                  : "bg-[color:var(--vd-border)]",
              )}
            />
          );
        })}
      </div>
    );
  }

  return (
    <motion.div
      key={clampedFilled}
      className={cn("flex w-full gap-[3px] px-0.5", className)}
      role="img"
      aria-hidden
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.035, delayChildren: 0.02 },
        },
      }}
    >
      {Array.from({ length: total }, (_, index) => {
        const isActive = index < clampedFilled;

        if (!isActive) {
          return (
            <div
              key={index}
              className={cn(
                CLAIM_QUARTETT_SEGMENT_CLASS,
                "bg-[color:var(--vd-border)]",
              )}
            />
          );
        }

        return (
          <motion.div
            key={index}
            variants={{
              hidden: { scaleX: 0, opacity: 0.35 },
              visible: {
                scaleX: 1,
                opacity: 1,
                transition: { duration: 0.28, ease: EASE_OUT },
              },
            }}
            className={cn(
              CLAIM_QUARTETT_SEGMENT_CLASS,
              "bg-[color:var(--vd-text)]",
            )}
          />
        );
      })}
    </motion.div>
  );
}
