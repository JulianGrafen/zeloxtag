"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PaywallModalFoldProps = {
  benefits: ReactNode;
  pricing: ReactNode;
  timeline: ReactNode;
  bottomNote?: string;
  footer?: ReactNode;
  className?: string;
};

/**
 * Modal paywall: dedicated scroll for benefits; pricing and timeline stay fixed below.
 */
export function PaywallModalFold({
  benefits,
  pricing,
  timeline,
  bottomNote,
  footer,
  className,
}: PaywallModalFoldProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-2.5", className)}>
      <div
        className={cn(
          "max-h-[min(17dvh,7.5rem)] shrink-0 overflow-y-auto overscroll-contain",
          "[-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]",
        )}
        aria-label="Vorteile scrollen"
      >
        <div className="pb-2">{benefits}</div>
      </div>

      <div className="shrink-0 pt-2">{pricing}</div>
      <div className="shrink-0">{timeline}</div>
      {bottomNote ? (
        <div className="flex min-h-0 flex-1 flex-col justify-end px-1 pt-1">
          <p
            className="text-center text-[0.78rem] leading-snug text-[color:var(--vd-muted)]"
          >
            {bottomNote}
          </p>
        </div>
      ) : null}
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </div>
  );
}
