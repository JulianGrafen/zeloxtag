import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "muted";

export type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  default:
    "border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)]",
  success:
    "border border-emerald-700/25 bg-emerald-600 text-white dark:border-emerald-400/30 dark:bg-emerald-500 dark:text-emerald-950",
  warning:
    "border border-amber-700/30 bg-amber-100 text-amber-950 dark:bg-amber-500/20 dark:text-amber-100",
  muted:
    "border border-transparent bg-neutral-900/5 text-[color:var(--vd-muted)]",
};

/**
 * Compact status chip — high-contrast success variant for matched vehicle rows.
 */
export function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.02em]",
        VARIANT_CLASS[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
