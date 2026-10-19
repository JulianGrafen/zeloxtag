"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { useIosHaptics } from "./use-ios-haptics";

export type IOSSheetOption = {
  id: string;
  label: string;
  selected?: boolean;
};

export type IOSSheetModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  options?: IOSSheetOption[];
  onSelectOption?: (id: string) => void;
  children?: ReactNode;
};

export function IOSSheetModal({
  open,
  title,
  onClose,
  options,
  onSelectOption,
  children,
}: IOSSheetModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { hapticSelection } = useIosHaptics();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Schließen"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Auswahl"}
        data-ios-ui
        className={cn(
          "ios-ui relative z-10 w-full max-w-lg rounded-t-3xl bg-[#1C1C1E] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl",
        )}
      >
        <div className="mx-auto mb-4 h-1.5 w-9 rounded-full bg-zinc-600" />
        {title ? (
          <p className="mb-3 text-center text-[13px] font-semibold uppercase tracking-wide text-zinc-400">
            {title}
          </p>
        ) : null}
        {options ? (
          <ul className="overflow-hidden rounded-xl bg-[#2C2C2E]/60">
            {options.map((option, index) => (
              <li key={option.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full min-h-[44px] items-center justify-between px-4 py-3 text-[17px] text-white active:bg-[#3A3A3C]",
                    index < options.length - 1 && "border-b border-white/[0.07]",
                  )}
                  onClick={() => {
                    hapticSelection();
                    onSelectOption?.(option.id);
                    onClose();
                  }}
                >
                  <span>{option.label}</span>
                  {option.selected ? (
                    <span className="text-[#0A84FF]" aria-hidden>
                      ✓
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {children}
      </div>
    </div>
  );
}
