"use client";

import { cn } from "@/lib/utils";

type ShowroomBuildPersonalityChipsProps = {
  labels: readonly string[];
  className?: string;
  compact?: boolean;
};

export function ShowroomBuildPersonalityChips({
  labels,
  className,
  compact = false,
}: ShowroomBuildPersonalityChipsProps) {
  if (labels.length === 0) return null;

  return (
    <ul
      className={cn(
        "flex flex-wrap gap-2",
        compact ? "justify-start" : "justify-center px-1",
        className,
      )}
      aria-label="Build-Vibes"
    >
      {labels.map((label) => (
        <li key={label}>
          <span
            className={cn(
              "inline-block rounded-full border border-white/15 bg-white/10 font-medium text-white/85",
              compact
                ? "px-2 py-0.5 text-[0.65rem]"
                : "px-3 py-1 text-[0.72rem] tracking-wide",
            )}
          >
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}
