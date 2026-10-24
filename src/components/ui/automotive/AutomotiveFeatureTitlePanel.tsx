import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { automotiveIconWrapClassName } from "./primitives";

type AutomotiveFeatureTitlePanelProps = {
  icon: ReactNode;
  title: string;
  kicker?: string;
  description?: ReactNode;
  className?: string;
};

export function AutomotiveFeatureTitlePanel({
  icon,
  title,
  kicker,
  description,
  className,
}: AutomotiveFeatureTitlePanelProps) {
  const hasMeta = Boolean(kicker || description);

  return (
    <div
      className={cn(
        "zt-feature-panel p-4",
        hasMeta ? "flex items-start gap-3" : "flex items-center gap-3",
        className,
      )}
    >
      <span
        className={cn(automotiveIconWrapClassName, "h-10 w-10 shrink-0")}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        {kicker ? (
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            {kicker}
          </p>
        ) : null}
        <h1
          className={cn(
            "font-[family-name:var(--font-display)] text-[1.35rem] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--vd-text)]",
            kicker ? "mt-1" : undefined,
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-[0.85rem] leading-snug text-[color:var(--vd-muted)]">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
