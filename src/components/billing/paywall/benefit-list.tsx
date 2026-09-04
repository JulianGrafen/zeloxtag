import { Check } from "lucide-react";

import { PRO_PAYWALL_MODAL_BENEFITS } from "@/lib/billing/pro-plan";

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
}: {
  items?: readonly string[];
}) {
  return (
    <ul
      className="vd-anim-list mt-5 space-y-3"
      aria-label="Vorteile von ZeloxTag Pro"
    >
      {items.map((benefit) => (
        <li
          key={benefit}
          className="flex gap-2.5 text-[0.84rem] leading-snug text-[color:var(--vd-text)]"
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
