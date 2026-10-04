"use client";

import { Flame } from "lucide-react";
import { useState } from "react";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

import { RoastBuildModal } from "./roast-build-modal";

type RoastBuildTriggerProps = {
  vehicleId: string;
  vehicleLabel: string;
  disabled?: boolean;
};

export function RoastBuildTrigger({
  vehicleId,
  vehicleLabel,
  disabled = false,
}: RoastBuildTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PressableButton
        type="button"
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#ff3366]/40 bg-gradient-to-r from-[#1a0a12] to-[#101018] px-4 py-3.5 text-[0.92rem] font-semibold text-[#ffe8ee] shadow-[0_0_24px_rgba(255,51,102,0.15)]"
        onClick={() => setOpen(true)}
      >
        <Flame className="h-5 w-5 text-[#ff3366]" aria-hidden />
        Build roasten lassen
      </PressableButton>

      <RoastBuildModal
        open={open}
        vehicleId={vehicleId}
        vehicleLabel={vehicleLabel}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
