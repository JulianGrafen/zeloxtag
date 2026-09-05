"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export function PromptCloseButton({
  onClick,
  label = "Schließen",
  className,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full",
        "border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]",
        "text-[color:var(--vd-muted)] transition hover:text-[color:var(--vd-text)]",
        className,
      )}
    >
      <X className="h-4 w-4" aria-hidden />
    </button>
  );
}
