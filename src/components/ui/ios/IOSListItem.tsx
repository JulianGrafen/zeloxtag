"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { useIosHaptics } from "./use-ios-haptics";

export type IOSListItemProps = {
  label: string;
  sublabel?: string;
  value?: string;
  href?: string;
  onPress?: () => void;
  icon?: ReactNode;
  trailing?: ReactNode;
  showChevron?: boolean;
  destructive?: boolean;
  isLast?: boolean;
  disabled?: boolean;
  className?: string;
};

type RowBodyProps = {
  label: string;
  sublabel?: string;
  value?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  showChevron: boolean;
  destructive: boolean;
};

function RowBody({
  label,
  sublabel,
  value,
  icon,
  trailing,
  showChevron,
  destructive,
}: RowBodyProps) {
  return (
    <>
      {icon ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 pl-0">
        <span
          className={cn(
            "block text-[15px] font-normal leading-snug",
            destructive ? "text-[#FF453A]" : "text-white",
          )}
        >
          {label}
        </span>
        {sublabel ? (
          <span className="mt-0.5 block text-[13px] leading-snug text-zinc-400">
            {sublabel}
          </span>
        ) : null}
      </span>
      {trailing ?? (
        <span className="flex shrink-0 items-center gap-2">
          {value ? (
            <span className="max-w-[9rem] truncate text-[15px] text-zinc-400">
              {value}
            </span>
          ) : null}
          {showChevron ? (
            <ChevronRight
              className="h-4 w-4 text-zinc-500/70"
              aria-hidden
            />
          ) : null}
        </span>
      )}
    </>
  );
}

export function IOSListItem({
  label,
  sublabel,
  value,
  href,
  onPress,
  icon,
  trailing,
  showChevron,
  destructive = false,
  isLast = false,
  disabled = false,
  className,
}: IOSListItemProps) {
  const { hapticLight } = useIosHaptics();
  const chevron = showChevron ?? (Boolean(href) && !trailing);

  const rowClass = cn(
    "ios-ui flex w-full items-center gap-3 py-2.5 pr-4 text-left transition-colors duration-75 active:bg-[#2C2C2E]",
    icon ? "pl-3" : "pl-4",
    !isLast && "border-b border-white/[0.07]",
    disabled && "pointer-events-none opacity-50",
    className,
  );

  const body = (
    <RowBody
      label={label}
      sublabel={sublabel}
      value={value}
      icon={icon}
      trailing={trailing}
      showChevron={chevron}
      destructive={destructive}
    />
  );

  if (href && !disabled) {
    return (
      <Link
        href={href}
        data-ios-ui
        className={rowClass}
        onClick={() => hapticLight()}
      >
        {body}
      </Link>
    );
  }

  if (onPress || trailing) {
    return (
      <div data-ios-ui className={rowClass}>
        {onPress ? (
          <button
            type="button"
            className="flex min-h-[44px] flex-1 items-center gap-3 text-left"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              hapticLight();
              onPress();
            }}
          >
            {icon ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                {icon}
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block text-[15px] font-normal",
                  destructive ? "text-[#FF453A]" : "text-white",
                )}
              >
                {label}
              </span>
              {sublabel ? (
                <span className="mt-0.5 block text-[13px] text-zinc-400">
                  {sublabel}
                </span>
              ) : null}
            </span>
          </button>
        ) : (
          <>
            {icon ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                {icon}
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] text-white">{label}</span>
              {sublabel ? (
                <span className="mt-0.5 block text-[13px] text-zinc-400">
                  {sublabel}
                </span>
              ) : null}
            </span>
          </>
        )}
        {trailing}
      </div>
    );
  }

  return (
    <div data-ios-ui className={rowClass}>
      {body}
    </div>
  );
}
