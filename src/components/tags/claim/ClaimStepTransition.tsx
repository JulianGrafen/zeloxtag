"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

import type { ClaimWizardStep } from "@/lib/tags/claim-flow-steps";

import {
  type ClaimTransitionDirection,
  useClaimMotion,
} from "./claim-motion";

type ClaimStepTransitionProps = {
  step: ClaimWizardStep;
  direction: ClaimTransitionDirection;
  children: ReactNode;
};

export function ClaimStepTransition({
  step,
  direction,
  children,
}: ClaimStepTransitionProps) {
  const motionConfig = useClaimMotion();
  const isIntro = step === "intro";

  if (isIntro) {
    return <div className="w-full">{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={step}
        variants={motionConfig.stepVariants(direction)}
        initial="initial"
        animate="animate"
        exit="exit"
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
