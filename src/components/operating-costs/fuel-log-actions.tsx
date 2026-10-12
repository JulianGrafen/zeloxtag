"use client";

import { PressableLink } from "@/components/vehicle-dashboard/Pressable";

type FuelLogActionsProps = {
  manualHref: string;
};

export function FuelLogActions({ manualHref }: FuelLogActionsProps) {
  return (
    <PressableLink
      href={manualHref}
      className="flex w-full items-center justify-center gap-2 zt-feature-panel px-4 py-3.5 text-[0.88rem] font-semibold text-[color:var(--vd-text)]"
    >
      Manuell eintragen
    </PressableLink>
  );
}
