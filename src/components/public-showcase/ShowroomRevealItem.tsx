"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { useShowroomMotion } from "./showroom-motion";

type ShowroomRevealItemProps = {
  children: ReactNode;
  className?: string;
};

export function ShowroomRevealItem({
  children,
  className,
}: ShowroomRevealItemProps) {
  const motionConfig = useShowroomMotion();

  return (
    <motion.div variants={motionConfig.staggerItem} className={className}>
      {children}
    </motion.div>
  );
}
