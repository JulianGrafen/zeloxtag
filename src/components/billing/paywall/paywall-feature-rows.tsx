import { Check } from "lucide-react";

import { parsePaywallBenefit } from "@/components/billing/paywall/paywall-benefit-parse";
import { PRO_PAYWALL_MODAL_BENEFITS } from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

export function PaywallFeatureRows({
  items = PRO_PAYWALL_MODAL_BENEFITS,
  highlightFirst = false,
  className,
}: {
  items?: readonly string[];
  highlightFirst?: boolean;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "paywall-feature-group overflow-hidden rounded-2xl bg-[color:var(--paywall-grouped-bg)] ring-1 ring-[color:var(--paywall-grouped-separator)]",
        className,
      )}
      aria-label="Vorteile von ZeloxTag Pro"
    >
      {items.map((benefit, index) => {
        const { title, description } = parsePaywallBenefit(benefit);
        const lead = highlightFirst && index === 0;

        return (
          <li
            key={benefit}
            className={cn(
              "flex gap-3 px-3.5 py-3",
              index > 0 &&
                "border-t border-[color:var(--paywall-grouped-separator)]",
            )}
          >
            <span
              className={cn(
                "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                lead
                  ? "bg-[color:var(--paywall-apple-blue)] text-white"
                  : "text-[color:var(--paywall-apple-blue)]",
              )}
              aria-hidden
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[15px] leading-snug tracking-[-0.02em] text-[color:var(--vd-text)]",
                  lead ? "font-semibold" : "font-medium",
                )}
              >
                {title}
              </p>
              {description ? (
                <p className="mt-0.5 text-[13px] leading-relaxed text-[color:var(--vd-muted)]">
                  {description}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
