"use client";

import { PrimaryGoalOptionList } from "@/components/onboarding/primary-goal-option-list";
import type { ZeloxPrimaryGoal } from "@/lib/onboarding/primary-goal";

type PrimaryGoalPickerProps = {
  onSelect: (goal: ZeloxPrimaryGoal) => void;
};

export function PrimaryGoalPicker({ onSelect }: PrimaryGoalPickerProps) {
  return (
    <div
      className="onboarding-scrim fixed inset-0 z-[85] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="primary-goal-title"
    >
      <div className="relative z-10 mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-[var(--vd-radius-panel)] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-[var(--vd-shadow-modal)] sm:rounded-[var(--vd-radius-panel)] sm:pb-6">
        <h2
          id="primary-goal-title"
          className="font-[family-name:var(--font-display)] text-[1.2rem] font-semibold leading-snug tracking-[-0.03em] text-[color:var(--vd-text)]"
        >
          Was ist dir am wichtigsten?
        </h2>
        <p className="mt-1.5 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
          Wir passen die kurze Einführung danach an — eine Auswahl reicht.
        </p>

        <div className="mt-4">
          <PrimaryGoalOptionList onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}
