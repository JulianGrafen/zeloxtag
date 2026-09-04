import {
  PRO_PAYWALL_PROGRESS_LABEL,
  PRO_PAYWALL_PROGRESS_PERCENT,
} from "@/lib/billing/pro-plan";

export function PaywallProgress({
  percent = PRO_PAYWALL_PROGRESS_PERCENT,
  label = PRO_PAYWALL_PROGRESS_LABEL,
}: {
  percent?: number;
  label?: string;
}) {
  return (
    <div className="vd-anim-header mt-4 mb-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[0.78rem] font-medium text-[color:var(--vd-text)]">
          {label}
        </span>
        <span className="text-[0.78rem] font-semibold tabular-nums text-[color:var(--vd-muted)]">
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
