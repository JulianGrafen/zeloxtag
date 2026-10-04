import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { cn } from "@/lib/utils";

import {
  automotiveCardTitleClassName,
  automotiveDisplayTitleClassName,
  automotiveIconWrapClassName,
  automotiveKickerClassName,
  automotiveMetaClassName,
  automotiveMetricHighlightClassName,
} from "./primitives";

export function AutomotiveSectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("px-1", automotiveKickerClassName, className)}>
      {children}
    </h2>
  );
}

export function AutomotiveSummaryPanel({
  title,
  metric,
  children,
  className,
}: {
  title: string;
  metric?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("zt-feature-panel p-5 sm:p-6", className)}>
      <h1 className={automotiveDisplayTitleClassName}>{title}</h1>
      {metric ? (
        <p className={cn("mt-3", automotiveMetricHighlightClassName)}>{metric}</p>
      ) : null}
      {children}
    </div>
  );
}

export function AutomotiveList({
  children,
  className,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <ul
      aria-label={ariaLabel}
      className={cn(
        "vd-anim-list zt-feature-panel overflow-hidden shadow-[var(--vd-shadow-sm)]",
        className,
      )}
    >
      {children}
    </ul>
  );
}

export function AutomotiveListRow({
  href,
  icon: Icon,
  title,
  amount,
  meta,
  badge,
  showDivider,
  className,
}: {
  href: string;
  icon: LucideIcon;
  title: ReactNode;
  amount?: ReactNode;
  meta: ReactNode;
  badge?: ReactNode;
  showDivider?: boolean;
  className?: string;
}) {
  return (
    <li className={className}>
      <PressableLink
        href={href}
        variant="row"
        className="group flex w-full items-start gap-3 px-4 py-3.5 text-left"
      >
        <span className={automotiveIconWrapClassName}>
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span className={automotiveCardTitleClassName}>{title}</span>
            {amount ? (
              <span
                className={cn(
                  automotiveCardTitleClassName,
                  "shrink-0 text-[0.88rem] tabular-nums",
                )}
              >
                {amount}
              </span>
            ) : null}
          </span>

          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className={cn(automotiveMetaClassName, "truncate")}>
              {meta}
            </span>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] group-data-[pressed=true]:translate-x-1.5 group-data-[pressed=true]:text-zinc-300"
              aria-hidden
            />
          </span>

          {badge ? <span className="mt-1.5 block">{badge}</span> : null}
        </span>
      </PressableLink>

      {showDivider ? (
        <div
          aria-hidden
          className="mx-4 border-t border-[color:var(--vd-border)] dark:border-white/5"
        />
      ) : null}
    </li>
  );
}

export function AutomotiveEmptyPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "zt-feature-panel p-5 text-[0.9rem] leading-relaxed text-zinc-400 shadow-[var(--vd-shadow-sm)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
