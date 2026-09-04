import {
  PRO_PAYWALL_PROGRESS_LABEL,
  PRO_PAYWALL_PROGRESS_PERCENT,
} from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

export function PaywallProgress({
  percent = PRO_PAYWALL_PROGRESS_PERCENT,
  label = PRO_PAYWALL_PROGRESS_LABEL,
  compact = false,
}: {
  percent?: number;
  label?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("vd-anim-header", compact ? "mt-2 mb-3" : "mt-4 mb-5")}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span
          className={cn(
            "font-medium text-[color:var(--vd-text)]",
            compact ? "text-[0.72rem]" : "text-[0.78rem]",
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "font-semibold tabular-nums text-[color:var(--vd-muted)]",
            compact ? "text-[0.72rem]" : "text-[0.78rem]",
          )}
        >
          {percent} %
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
        className="h-2 overflow-hidden rounded-full bg-black/8"
      >
        <div
          className="h-full rounded-full bg-[#0a0a0a] transition-[width] duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
