import { TrialBadge } from "@/components/billing/paywall/trial-badge";
import { cn } from "@/lib/utils";

export function PaywallHero({
  headline,
  subline,
  headlineId,
  showTrialBadge = true,
  compact = false,
}: {
  headline: string;
  subline: string;
  headlineId?: string;
  showTrialBadge?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn(compact ? "mt-2" : "mt-4")}>
      {showTrialBadge ? <TrialBadge compact={compact} /> : null}
      <h2
        id={headlineId}
        className={cn(
          "font-[family-name:var(--font-display)] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]",
          compact
            ? "mt-2 text-[1.15rem] leading-snug sm:text-[1.25rem]"
            : "mt-4 text-[1.35rem] sm:text-[1.5rem]",
        )}
      >
        {headline}
      </h2>
      <p
        className={cn(
          "claim-copy leading-snug text-[color:var(--vd-muted)]",
          compact ? "mt-1 text-[0.82rem] line-clamp-2" : "mt-2 text-[0.88rem]",
        )}
      >
        {subline}
      </p>
    </div>
  );
}
