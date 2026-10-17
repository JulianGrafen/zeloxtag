"use client";

import { motion, useReducedMotion } from "framer-motion";

import { PaywallGoalVisual } from "@/components/billing/paywall/paywall-goal-visual";
import type { PaywallVehicleHeroContext } from "@/lib/billing/paywall-personalization";
import type { PaywallVisualKind } from "@/lib/billing/paywall-personalization";
import { cn } from "@/lib/utils";

const HERO_ENTRANCE_EASE = [0.22, 1, 0.36, 1] as const;

export function PaywallAnimatedGoalVisual({
  kind,
  ariaLabel,
  className,
  figureClassName,
  vehicleHero,
}: {
  kind: PaywallVisualKind;
  ariaLabel: string;
  className?: string;
  figureClassName?: string;
  vehicleHero?: PaywallVehicleHeroContext | null;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "paywall-hero-visual relative shrink-0 overflow-hidden bg-[color:var(--paywall-grouped-bg)]",
        className,
      )}
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0.01 }
            : { duration: 0.45, ease: HERO_ENTRANCE_EASE }
        }
      >
        <PaywallGoalVisual
          kind={kind}
          ariaLabel={ariaLabel}
          compact
          className={figureClassName}
          vehicleHero={vehicleHero}
        />
      </motion.div>
    </div>
  );
}
