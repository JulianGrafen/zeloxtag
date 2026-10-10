"use client";

import { motion, useReducedMotion } from "framer-motion";

import { PaywallGoalVisual } from "@/components/billing/paywall/paywall-goal-visual";
import type { PaywallVisualKind } from "@/lib/billing/paywall-personalization";
import { cn } from "@/lib/utils";

const FLOAT_TRANSITION = {
  duration: 4.2,
  repeat: Infinity,
  ease: "easeInOut" as const,
};

export function PaywallAnimatedGoalVisual({
  kind,
  ariaLabel,
  className,
}: {
  kind: PaywallVisualKind;
  ariaLabel: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-gradient-to-b from-[color:var(--vd-surface-elevated)]/80 via-[color:var(--vd-surface)]/40 to-transparent px-3 pt-1 pb-2",
        className,
      )}
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 10 }}
        animate={
          reduceMotion
            ? { opacity: 1, scale: 1, y: 0 }
            : { opacity: 1, scale: 1, y: [0, -5, 0] }
        }
        transition={
          reduceMotion
            ? { duration: 0.25 }
            : {
                opacity: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
                scale: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
                y: { ...FLOAT_TRANSITION, delay: 0.55 },
              }
        }
      >
        <PaywallGoalVisual kind={kind} ariaLabel={ariaLabel} compact />
      </motion.div>
    </div>
  );
}
