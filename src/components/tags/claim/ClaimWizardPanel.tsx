"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { useClaimMotion } from "./claim-motion";

type ClaimWizardPanelProps = {
  kicker: string;
  title: string;
  copy: string;
  children: ReactNode;
};

export function ClaimWizardPanel({
  kicker,
  title,
  copy,
  children,
}: ClaimWizardPanelProps) {
  const motionConfig = useClaimMotion();

  return (
    <section className="claim-panel claim-panel-elevated w-full">
      <motion.header
        variants={motionConfig.staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.p variants={motionConfig.staggerItem} className="claim-kicker">
          {kicker}
        </motion.p>
        <motion.h1
          variants={motionConfig.staggerItem}
          className="claim-title mt-2"
        >
          {title}
        </motion.h1>
        <motion.p variants={motionConfig.staggerItem} className="claim-copy mt-2">
          {copy}
        </motion.p>
      </motion.header>
      {children}
    </section>
  );
}
