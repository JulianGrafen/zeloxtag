"use client";

import {
  PRIMARY_GOAL_OPTIONS,
  type ZeloxPrimaryGoal,
} from "@/lib/onboarding/primary-goal";
import { cn } from "@/lib/utils";

type PrimaryGoalOptionListProps = {
  selected?: ZeloxPrimaryGoal | null;
  onSelect: (goal: ZeloxPrimaryGoal) => void;
};

export function PrimaryGoalOptionList({
  selected = null,
  onSelect,
}: PrimaryGoalOptionListProps) {
  return (
    <ul className="flex flex-col gap-2.5">
      {PRIMARY_GOAL_OPTIONS.map((option) => {
        const isSelected = selected === option.id;
        return (
          <li key={option.id}>
            <button
              type="button"
              onClick={() => onSelect(option.id)}
              aria-pressed={isSelected}
              className={cn(
                "w-full rounded-[var(--vd-radius-control)] border px-4 py-3.5 text-left transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--vd-surface)]",
                "active:scale-[0.99]",
                isSelected
                  ? "border-[color:var(--vd-accent)] bg-[color:var(--vd-surface)] ring-1 ring-[color:var(--vd-accent)]/25"
                  : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] hover:border-[color:var(--vd-text)]/25 hover:bg-[color:var(--vd-surface)]",
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
        );
      })}
    </ul>
  );
}
