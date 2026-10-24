"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export function ShowcaseDocCollapsibleGroup({
  title,
  count,
  selectedCount,
  defaultOpen = false,
  variant = "panel",
  isLast = false,
  children,
}: {
  title: string;
  count: number;
  selectedCount: number;
  defaultOpen?: boolean;
  variant?: "panel" | "ios";
  isLast?: boolean;
  children: ReactNode;
}) {
  const summaryClass =
    variant === "ios"
      ? `flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[15px] font-normal text-white [&::-webkit-details-marker]:hidden ${
          isLast ? "" : "border-b border-white/10"
        }`
      : "flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5 text-[0.78rem] font-medium text-[color:var(--vd-text)] [&::-webkit-details-marker]:hidden";

  const bodyClass =
    variant === "ios"
      ? "space-y-2 border-b border-white/10 bg-black/20 px-3 py-3 last:border-b-0"
      : "mt-2 space-y-2";

  return (
    <details className="group" open={defaultOpen}>
      <summary className={summaryClass}>
        <span>
          {title}
          <span className="ml-1.5 font-normal text-[color:var(--vd-muted)]">
            ({count})
          </span>
          {selectedCount > 0 ? (
            <span
              className={
                variant === "ios"
                  ? "ml-1.5 font-normal text-zinc-400"
                  : "ml-1.5 font-normal text-[color:var(--vd-accent)]"
              }
            >
              · {selectedCount} sichtbar
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={
            variant === "ios"
              ? "h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180"
              : "h-4 w-4 shrink-0 text-[color:var(--vd-muted)] transition-transform group-open:rotate-180"
          }
          aria-hidden
        />
      </summary>
      <div className={bodyClass}>{children}</div>
    </details>
  );
}
