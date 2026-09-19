"use client";

import {
  PRIMARY_GOAL_OPTIONS,
  type ZeloxPrimaryGoal,
} from "@/lib/onboarding/primary-goal";
import { cn } from "@/lib/utils";

type PrimaryGoalPickerProps = {
  onSelect: (goal: ZeloxPrimaryGoal) => void;
};

export function PrimaryGoalPicker({ onSelect }: PrimaryGoalPickerProps) {
  return (
    <div
      className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center"
      style={{ background: "var(--vd-overlay)" }}
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

        <ul className="mt-4 flex flex-col gap-2.5">
          {PRIMARY_GOAL_OPTIONS.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => onSelect(option.id)}
                className={cn(
                  "w-full rounded-[var(--vd-radius-control)] border border-[color:var(--vd-border)]",
                  "bg-[color:var(--vd-surface-elevated)] px-4 py-3.5 text-left",
                  "transition hover:border-[color:var(--vd-text)]/25 hover:bg-[color:var(--vd-surface)]",
                  "active:scale-[0.99]",
                )}
              >
                <span className="block text-[0.92rem] font-semibold text-[color:var(--vd-text)]">
                  {option.title}
                </span>
                <span className="mt-0.5 block text-[0.78rem] leading-snug text-[color:var(--vd-muted)]">
                  {option.description}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
