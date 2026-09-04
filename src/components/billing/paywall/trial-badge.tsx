import { Calendar, ShieldCheck } from "lucide-react";

import {
  PRO_TRIAL_BADGE_LABEL,
  PRO_TRIAL_NO_COMMITMENT,
} from "@/lib/billing/pro-plan";

export function TrialBadge() {
  return (
    <div
      className="vd-anim-header mt-4 inline-flex w-full flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5"
      aria-label={`${PRO_TRIAL_BADGE_LABEL}. ${PRO_TRIAL_NO_COMMITMENT}`}
    >
      <span className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-emerald-900">
        <Calendar className="h-4 w-4 shrink-0" aria-hidden />
        {PRO_TRIAL_BADGE_LABEL}
      </span>
      <span className="hidden h-3.5 w-px bg-emerald-300 sm:block" aria-hidden />
      <span className="inline-flex items-center gap-1.5 text-[0.74rem] font-medium text-emerald-800">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {PRO_TRIAL_NO_COMMITMENT}
      </span>
    </div>
  );
}
