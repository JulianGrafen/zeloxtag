"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

import { useIosHaptics } from "./use-ios-haptics";

export type IOSSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Accessible label when no visible label is wired. */
  ariaLabel: string;
  className?: string;
};

export function IOSSwitch({
  checked,
  onCheckedChange,
  disabled = false,
  ariaLabel,
  className,
}: IOSSwitchProps) {
  const id = useId();
  const { hapticLight } = useIosHaptics();

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      data-ios-ui
      className={cn(
        "ios-ui relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full transition-colors duration-200",
        checked ? "bg-[#30D158]" : "bg-[#39393D]",
        disabled && "opacity-50",
        className,
      )}
      onClick={() => {
        if (disabled) return;
        hapticLight();
        onCheckedChange(!checked);
      }}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none block h-[27px] w-[27px] rounded-full bg-white shadow transition-transform duration-200 ease-out",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}
