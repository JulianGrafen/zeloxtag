"use client";

import { useReducedMotion } from "framer-motion";
import type { Transition, Variants } from "framer-motion";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const CLAIM_MOTION_DURATION = 0.32;

export const transitionSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
};

export type ClaimTransitionDirection = "forward" | "back";

function stepVariants(direction: ClaimTransitionDirection): Variants {
  const enterX = direction === "forward" ? 28 : -28;
  const exitX = direction === "forward" ? -20 : 20;
  return {
    initial: { opacity: 0, x: enterX },
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: CLAIM_MOTION_DURATION, ease: EASE_OUT },
    },
    exit: {
      opacity: 0,
      x: exitX,
      transition: { duration: 0.22, ease: EASE_OUT },
    },
  };
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: CLAIM_MOTION_DURATION, ease: EASE_OUT },
  },
};

const staticStep: Variants = {
  initial: { opacity: 1, x: 0 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 1, x: 0 },
};

/** Intro hat eigenes Content-Fade — kein zweites Slide/Fade hier. */
export const introStepVariants: Variants = {
  initial: { opacity: 1, x: 0 },
  animate: { opacity: 1, x: 0 },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: 0.22, ease: EASE_OUT },
  },
};

export function useClaimMotion() {
  const reduceMotion = useReducedMotion();

  return {
    reduceMotion: Boolean(reduceMotion),
    transitionSnappy: reduceMotion ? ({ duration: 0 } as Transition) : transitionSnappy,
    stepVariants: (direction: ClaimTransitionDirection) =>
      reduceMotion ? staticStep : stepVariants(direction),
    introStepVariants: reduceMotion ? staticStep : introStepVariants,
    staggerContainer: reduceMotion ? { hidden: {}, visible: {} } : staggerContainer,
    staggerItem: reduceMotion
      ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
      : staggerItem,
  };
}
