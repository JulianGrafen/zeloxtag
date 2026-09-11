"use client";

import { motion } from "framer-motion";

import { useShowroomMotion } from "./showroom-motion";
import { showroom } from "./showroom-styles";

export function ShowroomBrandBanner() {
  const motionConfig = useShowroomMotion();

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
      <motion.div
        className="bg-black px-5 pb-2.5 pt-[max(0.65rem,env(safe-area-inset-top))]"
        variants={motionConfig.fadeUp}
        initial="hidden"
        animate="visible"
      >
        <p className={`text-center ${showroom.brandWordmark}`}>
          <span className="sr-only">ZeloxTag</span>
          <span aria-hidden>ZELOX TAG</span>
        </p>
      </motion.div>
      <div
        className="h-[4.5rem] bg-gradient-to-b from-black via-black/85 to-transparent sm:h-[5.5rem]"
        aria-hidden
      />
    </div>
  );
}
