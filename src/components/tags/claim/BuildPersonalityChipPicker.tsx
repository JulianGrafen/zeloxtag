"use client";

import {
  BUILD_PERSONALITY_CHIP_MAX,
  BUILD_PERSONALITY_CHIPS,
  type BuildPersonalityChipId,
} from "@/lib/vehicles/build-personality-chips";
import { cn } from "@/lib/utils";

type BuildPersonalityChipPickerProps = {
  selected: readonly BuildPersonalityChipId[];
  onChange: (next: BuildPersonalityChipId[]) => void;
  compact?: boolean;
};

export function BuildPersonalityChipPicker({
  selected,
  onChange,
  compact = false,
}: BuildPersonalityChipPickerProps) {
  const atMax = selected.length >= BUILD_PERSONALITY_CHIP_MAX;

  function toggle(id: BuildPersonalityChipId) {
    if (selected.includes(id)) {
      onChange(selected.filter((entry) => entry !== id));
      return;
    }
    if (atMax) return;
    onChange([...selected, id]);
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <p
        className={cn(
          "text-[color:var(--vd-muted)]",
          compact ? "text-[0.72rem]" : "text-[0.78rem]",
        )}
      >
        {selected.length} / {BUILD_PERSONALITY_CHIP_MAX} gewählt
        {compact ? null : " · optional"}
      </p>
      <div className={cn("flex flex-wrap", compact ? "gap-1.5" : "gap-2")}>
        {BUILD_PERSONALITY_CHIPS.map((chip) => {
          const isSelected = selected.includes(chip.id);
          const disabled = !isSelected && atMax;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => toggle(chip.id)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={cn(
                "rounded-full border font-medium transition",
                compact ? "px-2.5 py-1.5 text-[0.75rem]" : "px-3.5 py-2 text-[0.82rem]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]",
                "active:scale-[0.98]",
                isSelected
                  ? "border-[color:var(--vd-accent)] bg-[color:var(--vd-surface)] text-[color:var(--vd-text)] ring-1 ring-[color:var(--vd-accent)]/25"
                  : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-muted)]",
                disabled && "cursor-not-allowed opacity-45",
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
