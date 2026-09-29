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
            <div
              className={cn(
                "rounded-[var(--vd-radius-control)] border transition",
                isSelected
                  ? "border-[color:var(--vd-accent)] bg-[color:var(--vd-surface)] ring-1 ring-[color:var(--vd-accent)]/25"
                  : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] hover:border-[color:var(--vd-text)]/25 hover:bg-[color:var(--vd-surface)]",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(option.id)}
                aria-pressed={isSelected}
                className={cn(
                  "w-full px-4 py-3.5 text-left",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--vd-surface)]",
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
              {option.requirement ? (
                <div className="border-t border-[color:var(--vd-border)]/80 px-4 py-2.5">
                  {option.requirementHref ? (
                    <a
                      href={option.requirementHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1 text-[0.72rem] font-semibold uppercase tracking-wide text-[color:var(--vd-text)] underline-offset-2 hover:underline",
                        isSelected
                          ? "text-[color:var(--vd-accent)]"
                          : "text-[color:var(--vd-muted)]",
                      )}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {option.requirement}
                      <span aria-hidden>↗</span>
                    </a>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide",
                        isSelected
                          ? "border-[color:var(--vd-accent)]/40 bg-[color:var(--vd-accent)]/10 text-[color:var(--vd-text)]"
                          : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-muted)]",
                      )}
                    >
                      {option.requirement}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
