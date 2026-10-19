import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type IOSGroupedListProps = {
  headerTitle?: string;
  footerText?: string;
  children: ReactNode;
  className?: string;
};

export function IOSGroupedList({
  headerTitle,
  footerText,
  children,
  className,
}: IOSGroupedListProps) {
  return (
    <section data-ios-ui className={cn("ios-ui w-full", className)}>
      {headerTitle ? (
        <h2 className="px-4 pb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
          {headerTitle}
        </h2>
      ) : null}
      <div className="overflow-hidden rounded-2xl bg-[color:var(--ios-surface,#1C1C1E)]">
        {children}
      </div>
      {footerText ? (
        <p className="px-4 pt-1.5 text-xs leading-snug text-zinc-500">
          {footerText}
        </p>
      ) : null}
    </section>
  );
}
