"use client";

import type { VehicleRoastResult } from "@/lib/roast/roast-schema";

type RoastResultViewProps = {
  vehicleLabel: string;
  roast: VehicleRoastResult;
};

export function RoastResultView({ vehicleLabel, roast }: RoastResultViewProps) {
  return (
    <div className="w-full min-w-0 space-y-3">
      <p className="text-center text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8b8b9a]">
        {vehicleLabel}
      </p>
      <blockquote
        className="w-full min-w-0 overflow-visible rounded-2xl border border-[#ff3366]/30 bg-gradient-to-br from-[#1a0a12] to-[#12121a] px-4 py-5 text-center text-[0.98rem] font-semibold leading-[1.45] break-words hyphens-auto text-[#ffe8ee] shadow-[0_0_32px_rgba(255,51,102,0.12)] sm:px-5 sm:py-7 sm:text-[1.1rem]"
      >
        <span className="block whitespace-normal">„{roast.punchline}"</span>
      </blockquote>
    </div>
  );
}
