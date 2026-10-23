"use client";

import { motion } from "framer-motion";

import { ShowcaseZeloxWordmarkLink } from "./ShowcaseZeloxWordmarkLink";
import { useShowroomMotion } from "./showroom-motion";

export function ShowroomBrandBanner() {
  const motionConfig = useShowroomMotion();

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
      <motion.div
        className="pointer-events-auto bg-black px-5 pb-2.5 pt-[max(0.65rem,env(safe-area-inset-top))]"
        variants={motionConfig.fadeUp}
        initial="hidden"
        animate="visible"
      >
        <div className="text-center">
          <ShowcaseZeloxWordmarkLink variant="heroBanner" />
        </div>
      </motion.div>
      <div
        className="h-[4.5rem] bg-gradient-to-b from-black via-black/85 to-transparent sm:h-[5.5rem]"
        aria-hidden
      />
    </div>
  );
}
