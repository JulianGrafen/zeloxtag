"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export function ShowcaseDocCollapsibleGroup({
  title,
  count,
  selectedCount,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: number;
  selectedCount: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group" open={defaultOpen}>
      <summary
        className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5 text-[0.78rem] font-medium text-[color:var(--vd-text)] [&::-webkit-details-marker]:hidden"
      >
        <span>
          {title}
          <span className="ml-1.5 font-normal text-[color:var(--vd-muted)]">
            ({count})
          </span>
          {selectedCount > 0 ? (
            <span className="ml-1.5 font-normal text-[color:var(--vd-accent)]">
              · {selectedCount} sichtbar
            </span>
          ) : null}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)] transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="mt-2 space-y-2">{children}</div>
    </details>
  );
}
