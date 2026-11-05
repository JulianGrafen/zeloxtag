"use client";

import type { ReactNode } from "react";

import { ScanContent } from "@/components/layout/scan-content";

type ClaimShellProps = {
  children: ReactNode;
  intro?: boolean;
  /** Vertically center wizard content (e.g. empathy beat). */
  centered?: boolean;
};

export function ClaimShell({
  children,
  intro = false,
  centered = false,
}: ClaimShellProps) {
  return (
    // Forced OLED-dark „garage at night“ stage — `.dark` remaps every --vd-* token.
    <div className="dark claim-stage relative min-h-dvh w-full overflow-x-clip text-white [color-scheme:dark]">
      <div className="claim-stage__glow" aria-hidden />
      <ScanContent
        centered={intro || centered}
        className={
          intro
            ? "claim-premium claim-premium-intro-shell overflow-x-clip px-0 sm:px-0"
            : "claim-premium claim-premium-wizard overflow-x-clip"
        }
      >
        <div
          className={
            intro ? "mx-auto w-full max-w-lg px-4 sm:px-5" : "contents"
          }
        >
          <div className="flex w-full flex-1 flex-col gap-5">{children}</div>
        </div>
      </ScanContent>
    </div>
  );
}
