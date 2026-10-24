import { cn } from "@/lib/utils";

export function serviceFilterChipClassName(active: boolean): string {
  return cn(
    "shrink-0 rounded-full px-3 py-1.5 text-[0.75rem] font-semibold tracking-[-0.01em] transition-colors",
    active
      ? cn(
          "border border-transparent bg-[color:var(--vd-accent)] text-[color:var(--primary-foreground)] shadow-sm",
          "dark:border-white/35 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]",
        )
      : cn(
          "border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)]",
          "dark:border-white/12 dark:bg-zinc-800/75 dark:text-zinc-300",
        ),
  );
}

/** Slightly larger copy for form modal chips. */
export function serviceFilterChipFormClassName(active: boolean): string {
  return cn(serviceFilterChipClassName(active), "text-[0.78rem]");
}
