import type { ReactNode } from "react";

import {
  automotiveBodyMutedClassName,
  automotiveCardTitleClassName,
  automotiveMetricHighlightClassName,
} from "@/components/ui/automotive";
import { cn } from "@/lib/utils";

export const DOCUMENT_DETAIL_HERO_CLASS =
  "zt-feature-panel p-5 shadow-[var(--vd-shadow-sm)] sm:p-6";

/** Beleg detail: card-scale type, full-width wrapping (not display hero size). */
export const DOCUMENT_DETAIL_TITLE_CLASS = cn(
  automotiveCardTitleClassName,
  "text-[1.02rem] sm:text-[1.0625rem] leading-snug break-words [overflow-wrap:anywhere] hyphens-auto",
);

type DocumentDetailHeroProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right column: amount, status, metrics — right-aligned. */
  trailing?: ReactNode;
  /** Optional chips under trailing (still right-aligned). */
  chips?: ReactNode;
  className?: string;
};

export function DocumentDetailHero({
  title,
  subtitle,
  trailing,
  chips,
  className,
}: DocumentDetailHeroProps) {
  const metaRow = Boolean(subtitle || trailing);

  return (
    <header className={cn(DOCUMENT_DETAIL_HERO_CLASS, className)}>
      <div className="flex flex-col gap-2">
        <div className="min-w-0">
          {typeof title === "string" ? (
            <h1 className={DOCUMENT_DETAIL_TITLE_CLASS}>{title}</h1>
          ) : (
            <div className="min-w-0">{title}</div>
          )}
        </div>

        {metaRow ? (
          <div className="flex items-start justify-between gap-4">
            {subtitle ? (
              <p className={cn("min-w-0 flex-1", automotiveBodyMutedClassName)}>
                {subtitle}
              </p>
            ) : null}
            {trailing ? (
              <div
                className={cn(
                  "shrink-0 text-right",
                  subtitle ? "max-w-[55%]" : "ml-auto",
                )}
              >
                {trailing}
              </div>
            ) : null}
          </div>
        ) : null}

        {chips ? (
          <div className="flex flex-wrap justify-end gap-1.5">{chips}</div>
        ) : null}
      </div>
    </header>
  );
}

export function DocumentDetailHeroAmount({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        automotiveMetricHighlightClassName,
        "text-right text-[1.05rem] font-bold leading-none tabular-nums sm:text-[1.1rem]",
      )}
    >
      {children}
    </p>
  );
}

export function DocumentDetailHeroChip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.68rem] font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}
