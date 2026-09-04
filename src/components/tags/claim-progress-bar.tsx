"use client";

import { claimWizardProgressPercent } from "@/lib/tags/claim-flow-steps";
import type { ClaimWizardStep } from "@/lib/tags/claim-flow-steps";

type ClaimProgressBarProps = {
  step: ClaimWizardStep;
  needsAccount: boolean;
};

export function ClaimProgressBar({ step, needsAccount }: ClaimProgressBarProps) {
  const percent = claimWizardProgressPercent(step, needsAccount);

  return (
    <div className="mb-5 vd-anim-header">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[0.72rem] font-medium tracking-[0.12em] text-[color:var(--vd-muted)] uppercase">
          Fortschritt
        </span>
        <span className="text-[0.82rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
          {percent} %
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`Registrierung ${percent} Prozent abgeschlossen`}
        className="h-2 overflow-hidden rounded-full bg-black/8"
      >
        <div
          className="h-full rounded-full bg-[#0a0a0a] transition-[width] duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
