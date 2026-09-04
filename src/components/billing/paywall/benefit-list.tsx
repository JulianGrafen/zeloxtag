import { Check } from "lucide-react";

import { PRO_PAYWALL_MODAL_BENEFITS } from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

function BenefitText({ benefit }: { benefit: string }) {
  const colonIndex = benefit.indexOf(":");
  if (colonIndex === -1) {
    return <span>{benefit}</span>;
  }

  const title = benefit.slice(0, colonIndex + 1);
  const description = benefit.slice(colonIndex + 1);

  return (
    <span>
      <span className="font-semibold">{title}</span>
      {description}
    </span>
  );
}

export function BenefitList({
  items = PRO_PAYWALL_MODAL_BENEFITS,
  compact = false,
}: {
  items?: readonly string[];
  compact?: boolean;
}) {
  return (
    <ul
      className={cn(
        "vd-anim-list",
        compact ? "mt-4 space-y-2.5" : "mt-5 space-y-3",
      )}
      aria-label="Vorteile von ZeloxTag Pro"
    >
      {items.map((benefit) => (
        <li
          key={benefit}
          className={cn(
            "flex gap-2.5 leading-snug text-[color:var(--vd-text)]",
            compact ? "text-[0.8rem]" : "text-[0.84rem]",
          )}
        >
          <span
            className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"
            aria-hidden
          >
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          <BenefitText benefit={benefit} />
        </li>
      ))}
    </ul>
  );
}
