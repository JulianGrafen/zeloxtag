"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import type { DashboardTabId } from "./dashboard-tab-switch";

const PANEL_EASE = [0.32, 0.72, 0, 1] as const;
const PANEL_DURATION = 0.24;

type DashboardTabPanelTransitionProps = {
  activeTab: DashboardTabId;
  overview: ReactNode;
  timeline: ReactNode;
};

export function DashboardTabPanelTransition({
  activeTab,
  overview,
  timeline,
}: DashboardTabPanelTransitionProps) {
  const reduceMotion = useReducedMotion();

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: PANEL_DURATION, ease: PANEL_EASE };

  const motionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
      };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeTab}
        {...motionProps}
        transition={transition}
        className="min-w-0"
      >
        {activeTab === "overview" ? overview : timeline}
      </motion.div>
    </AnimatePresence>
  );
}
