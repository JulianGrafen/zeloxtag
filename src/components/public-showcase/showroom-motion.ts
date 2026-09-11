"use client";

import { useReducedMotion } from "framer-motion";
import type { Transition, Variants } from "framer-motion";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const SHOWROOM_MOTION_DURATION = 0.32;
export const SHOWROOM_STAGGER_CHILDREN = 0.04;

export const transitionSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, x: 8, y: 10 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: SHOWROOM_MOTION_DURATION, ease: EASE_OUT },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: SHOWROOM_STAGGER_CHILDREN,
      delayChildren: 0.03,
    },
  },
};

/** Hero copy: starts revealing slightly sooner. */
export const heroStaggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: SHOWROOM_STAGGER_CHILDREN,
      delayChildren: 0.01,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, x: 6, y: 10 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: SHOWROOM_MOTION_DURATION, ease: EASE_OUT },
  },
};

export const rowRevealContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.02,
    },
  },
};

export const rowRevealItem: Variants = {
  hidden: { opacity: 0, x: 10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.28, ease: EASE_OUT },
  },
};

export const heroImageSettle: Variants = {
  hidden: { opacity: 0, scale: 1.02 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.65, ease: EASE_OUT },
  },
};

export const HERO_KEN_BURNS_DURATION_S = 20;

const staticVisible: Variants = {
  hidden: { opacity: 1, x: 0, y: 0, scale: 1 },
  visible: { opacity: 1, x: 0, y: 0, scale: 1 },
};

const staticContainer: Variants = {
  hidden: {},
  visible: {},
};

export function useShowroomMotion() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return {
      reduceMotion: true,
      fadeUp: staticVisible,
      staggerContainer: staticContainer,
      heroStaggerContainer: staticContainer,
      staggerItem: staticVisible,
      rowRevealContainer: staticContainer,
      rowRevealItem: staticVisible,
      heroImageSettle: staticVisible,
      enableHeroKenBurns: false,
      transitionSnappy: { duration: 0 } as Transition,
      viewport: { once: true, amount: 0.15 },
    };
  }

  return {
    reduceMotion: false,
    fadeUp,
    staggerContainer,
    heroStaggerContainer,
    staggerItem,
    rowRevealContainer,
    rowRevealItem,
    heroImageSettle,
    enableHeroKenBurns: true,
    transitionSnappy,
    viewport: { once: true, amount: 0.15 },
  };
}
