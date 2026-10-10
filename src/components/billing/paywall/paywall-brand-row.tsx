import { PRO_PLAN_NAME } from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

export function PaywallBrandRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 text-[color:var(--vd-text)]",
        className,
      )}
    >
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[color:var(--paywall-benefit-icon-bg)] text-[0.65rem] font-bold tracking-tight text-[color:var(--paywall-benefit-icon-fg)]"
        aria-hidden
      >
        Z
      </span>
      <span className="text-[0.82rem] font-semibold tracking-[-0.02em]">
        {PRO_PLAN_NAME}
      </span>
    </div>
  );
}
