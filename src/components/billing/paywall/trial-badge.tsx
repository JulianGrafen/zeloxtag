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
        "vd-anim-header inline-flex w-full flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900",
        compact ? "mt-2 px-3 py-2" : "mt-4 px-3.5 py-2.5",
      )}
      aria-label={`${PRO_TRIAL_BADGE_LABEL}. ${PRO_TRIAL_NO_COMMITMENT}`}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-semibold text-emerald-900",
          compact ? "text-[0.72rem]" : "text-[0.78rem]",
        )}
      >
        <Calendar className={cn("shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden />
        {PRO_TRIAL_BADGE_LABEL}
      </span>
      <span className="hidden h-3.5 w-px bg-emerald-300 sm:block" aria-hidden />
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-medium text-emerald-800",
          compact ? "text-[0.68rem]" : "text-[0.74rem]",
        )}
      >
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {PRO_TRIAL_NO_COMMITMENT}
      </span>
    </div>
  );
}
