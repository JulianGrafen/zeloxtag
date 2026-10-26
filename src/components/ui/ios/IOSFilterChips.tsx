"use client";

import { cn } from "@/lib/utils";

import { IOS_CHIP_ACTIVE, IOS_CHIP_INACTIVE } from "./ios-styles";
import { useIosHaptics } from "./use-ios-haptics";

export type IOSFilterChip<TId extends string = string> = {
  id: TId;
  label: string;
  count?: number;
  title?: string;
};

export type IOSFilterChipsProps<TId extends string = string> = {
  chips: ReadonlyArray<IOSFilterChip<TId>>;
  activeId?: TId;
  onChange: (id: TId) => void;
  ariaLabel?: string;
  className?: string;
};

/** Horizontally scrolling filter pills — active is solid white, inactive sits on the card surface. */
export function IOSFilterChips<TId extends string = string>({
  chips,
  activeId,
  onChange,
  ariaLabel = "Filter",
  className,
}: IOSFilterChipsProps<TId>) {
  const { hapticLight } = useIosHaptics();

  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      className={cn(
        "-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {chips.map((chip) => {
        const active = chip.id === activeId;
        return (
          <button
            key={chip.id}
            type="button"
            title={chip.title ?? chip.label}
            aria-pressed={active}
            onClick={() => {
              if (active) return;
              hapticLight();
              onChange(chip.id);
            }}
            className={active ? IOS_CHIP_ACTIVE : IOS_CHIP_INACTIVE}
          >
            {chip.label}
            {typeof chip.count === "number" ? (
              <span
                className={cn(
                  "tabular-nums",
                  active ? "text-black/50" : "text-[#48484A]",
                )}
              >
                {chip.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
