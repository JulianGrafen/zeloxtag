import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const DOCUMENT_DETAIL_HERO_CLASS =
  "rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)] sm:p-6";

export const DOCUMENT_DETAIL_TITLE_CLASS =
  "font-[family-name:var(--font-display)] text-[1.35rem] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--vd-text)] sm:text-[1.5rem]";

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
  const hasAside = Boolean(trailing || chips);

  return (
    <header className={cn(DOCUMENT_DETAIL_HERO_CLASS, className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {typeof title === "string" ? (
            <h1 className={DOCUMENT_DETAIL_TITLE_CLASS}>{title}</h1>
          ) : (
            <div className="min-w-0">{title}</div>
          )}
          {subtitle ? (
            <p className="mt-1 text-[0.88rem] leading-snug text-[color:var(--vd-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {hasAside ? (
          <div className="flex max-w-[45%] shrink-0 flex-col items-end gap-2 text-right">
            {trailing}
            {chips ? (
              <div className="flex flex-wrap justify-end gap-1.5">{chips}</div>
            ) : null}
          </div>
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
    <p className="text-[1.28rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-[color:var(--vd-text)] sm:text-[1.35rem]">
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
