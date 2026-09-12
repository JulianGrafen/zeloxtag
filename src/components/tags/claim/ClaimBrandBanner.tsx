"use client";

import { showroom } from "@/components/public-showcase/showroom-styles";

/** Black bar + fade — same treatment as public showcase hero. */
export function ClaimBrandBanner() {
  return (
    <div className="pointer-events-none relative w-full">
      <div className="bg-black px-5 pb-2.5 pt-[max(0.65rem,env(safe-area-inset-top))]">
        <p className={`text-center ${showroom.brandWordmark}`}>
          <span className="sr-only">ZeloxTag</span>
          <span aria-hidden>ZELOX TAG</span>
        </p>
      </div>
      <div
        className="h-[4.5rem] bg-gradient-to-b from-black via-black/85 to-transparent sm:h-[5.5rem]"
        aria-hidden
      />
    </div>
  );
}
