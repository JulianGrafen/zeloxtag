"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PaywallModalFoldProps = {
  benefits?: ReactNode;
  pricing: ReactNode;
  timeline: ReactNode;
  bottomNote?: string;
  footer?: ReactNode;
  className?: string;
};

/** Modal paywall fold — pricing & trial below hero copy; scroll in parent. */
export function PaywallModalFold({
  benefits,
  pricing,
  timeline,
  bottomNote,
  footer,
  className,
}: PaywallModalFoldProps) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {benefits ? <div className="pb-2">{benefits}</div> : null}

      <div className="shrink-0 pt-1">{pricing}</div>
      <div className="shrink-0">{timeline}</div>
      {bottomNote ? (
        <div className="shrink-0 px-1 pt-2 pb-3">
          <p className="text-center text-[0.78rem] leading-snug text-[color:var(--vd-muted)]">
            {bottomNote}
          </p>
        </div>
      ) : null}
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </div>
  );
}
