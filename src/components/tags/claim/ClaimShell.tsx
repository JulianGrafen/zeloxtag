"use client";

import type { ReactNode } from "react";

import { LegalFooterNav } from "@/components/legal/legal-footer-nav";
import { ScanContent } from "@/components/layout/scan-content";

type ClaimShellProps = {
  children: ReactNode;
  intro?: boolean;
};

export function ClaimShell({ children, intro = false }: ClaimShellProps) {
  return (
    <ScanContent
      centered={intro}
      className={
        intro
          ? "claim-premium claim-premium-intro-shell overflow-x-clip px-0 sm:px-0"
          : "claim-premium claim-premium-wizard"
      }
    >
      <div className={intro ? "mx-auto w-full max-w-lg px-4 sm:px-5" : "contents"}>
        <div className="flex w-full flex-1 flex-col gap-5">{children}</div>
        <LegalFooterNav className="mt-6 pb-2" />
      </div>
    </ScanContent>
  );
}
