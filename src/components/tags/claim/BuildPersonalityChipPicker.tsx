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
};

export function BuildPersonalityChipPicker({
  selected,
  onChange,
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
    <div className="space-y-3">
      <p className="text-[0.78rem] text-[color:var(--vd-muted)]">
        {selected.length} / {BUILD_PERSONALITY_CHIP_MAX} gewählt · optional
      </p>
      <div className="flex flex-wrap gap-2">
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
                "rounded-full border px-3.5 py-2 text-[0.82rem] font-medium transition",
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
