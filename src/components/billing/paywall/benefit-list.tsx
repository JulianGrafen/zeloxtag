import { Check } from "lucide-react";

import { parsePaywallBenefit } from "@/components/billing/paywall/paywall-benefit-parse";
import { PRO_PAYWALL_MODAL_BENEFITS } from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

function BenefitText({ benefit }: { benefit: string }) {
  const { title, description } = parsePaywallBenefit(benefit);
  if (!description) {
    return <span>{title}</span>;
  }

  return (
    <span>
      <span className="font-semibold">{title}:</span> {description}
    </span>
  );
}

export function BenefitList({
  items = PRO_PAYWALL_MODAL_BENEFITS,
  compact = false,
  highlightFirst = false,
}: {
  items?: readonly string[];
  compact?: boolean;
  highlightFirst?: boolean;
}) {
  return (
    <ul
      className={cn(
        "vd-anim-list",
        compact ? "mt-1 space-y-3" : "mt-5 space-y-3",
      )}
      aria-label="Vorteile von ZeloxTag Pro"
    >
      {items.map((benefit, index) => {
        const lead = highlightFirst && index === 0;
        return (
          <li
            key={benefit}
            className={cn(
              "flex gap-2.5 leading-snug text-[color:var(--vd-text)]",
              compact ? "text-[0.8rem]" : "text-[0.84rem]",
              lead && "font-semibold",
            )}
          >
            <span
              className={cn(
                "mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full bg-[color:var(--paywall-benefit-icon-bg)] text-[color:var(--paywall-benefit-icon-fg)]",
                lead ? "h-6 w-6" : "h-5 w-5",
              )}
              aria-hidden
            >
              <Check
                className={cn(lead ? "h-3.5 w-3.5" : "h-3 w-3")}
                strokeWidth={3}
              />
            </span>
            <BenefitText benefit={benefit} />
          </li>
        );
      })}
    </ul>
  );
}
