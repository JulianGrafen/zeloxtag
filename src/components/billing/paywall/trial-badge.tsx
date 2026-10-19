import { ScanLine } from "lucide-react";

import { PRO_FREE_KI_SCAN_HOOK } from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

/** Gratis-KI-Scan Hinweis (kein Trial, kein Button). */
export function FreeScanOfferBadge({ compact = false }: { compact?: boolean }) {
  return (
    <p
      className={cn(
        "inline-flex w-full items-center gap-2 rounded-2xl border border-[color:var(--paywall-trial-border)] bg-[color:var(--paywall-trial-bg)] px-3.5 py-2.5 text-[color:var(--paywall-trial-text)]",
        compact ? "text-[0.72rem]" : "text-[0.78rem]",
      )}
      role="note"
    >
      <ScanLine className={cn("shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden />
      <span className="font-semibold leading-snug">{PRO_FREE_KI_SCAN_HOOK}</span>
    </p>
  );
}

/** @deprecated Use {@link FreeScanOfferBadge} */
export const TrialBadge = FreeScanOfferBadge;
