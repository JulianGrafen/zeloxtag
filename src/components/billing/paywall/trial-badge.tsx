import { Calendar, ShieldCheck } from "lucide-react";

import {
  PRO_TRIAL_BADGE_LABEL,
  PRO_TRIAL_NO_COMMITMENT,
} from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

export function TrialBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "inline-flex w-full flex-wrap items-center gap-2 rounded-2xl border border-[color:var(--paywall-trial-border)] bg-[color:var(--paywall-trial-bg)] text-[color:var(--paywall-trial-text)]",
        compact ? "mt-0 px-3 py-2" : "mt-4 px-3.5 py-2.5",
      )}
      aria-label={`${PRO_TRIAL_BADGE_LABEL}. ${PRO_TRIAL_NO_COMMITMENT}`}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-semibold text-[color:var(--paywall-trial-text)]",
          compact ? "text-[0.72rem]" : "text-[0.78rem]",
        )}
      >
        <Calendar className={cn("shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden />
        {PRO_TRIAL_BADGE_LABEL}
      </span>
      <span
        className="hidden h-3.5 w-px bg-[color:var(--paywall-trial-divider)] sm:block"
        aria-hidden
      />
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-medium text-[color:var(--paywall-trial-text-muted)]",
          compact ? "text-[0.68rem]" : "text-[0.74rem]",
        )}
      >
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {PRO_TRIAL_NO_COMMITMENT}
      </span>
    </div>
  );
}
