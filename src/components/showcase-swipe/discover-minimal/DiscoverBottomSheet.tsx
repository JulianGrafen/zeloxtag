"use client";

import { useCallback, useEffect, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type DiscoverBottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function DiscoverBottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: DiscoverBottomSheetProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Schließen"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "discover-sheet-title" : undefined}
        className={cn(
          "relative z-10 flex max-h-[min(88dvh,720px)] w-full max-w-lg flex-col rounded-t-3xl bg-zinc-950 ring-1 ring-white/10",
          "pb-[max(1rem,env(safe-area-inset-bottom))]",
          className,
        )}
      >
        <div className="flex shrink-0 justify-center pt-3 pb-2">
          <span
            className="h-1 w-10 rounded-full bg-white/20"
            aria-hidden
          />
        </div>
        {title ? (
          <h2
            id="discover-sheet-title"
            className="shrink-0 px-5 pb-3 text-[0.95rem] font-semibold text-white"
          >
            {title}
          </h2>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-white/10 px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
