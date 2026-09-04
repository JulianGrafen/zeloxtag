import { Check } from "lucide-react";

import {
  PRO_PLAN_BENEFITS,
  proCheckoutLead,
  type ProCheckoutAudience,
} from "@/lib/billing/pro-plan";

export function ProPlanBenefits({
  audience = "new",
  showLead = true,
}: {
  audience?: ProCheckoutAudience;
  showLead?: boolean;
}) {
  return (
    <div className="mt-5 mb-8">
      {showLead ? (
        <p className="text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
          {proCheckoutLead(audience)}
        </p>
      ) : null}
      <ul
        className={`${showLead ? "mt-4" : "mt-0"} space-y-4`}
        aria-label="Vorteile von ZeloxTag Pro"
      >
        {PRO_PLAN_BENEFITS.map((benefit) => (
          <li
            key={benefit.title}
            className="flex gap-2.5 text-[0.86rem] leading-snug text-[color:var(--vd-text)]"
          >
            <span
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white"
              aria-hidden
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span>
              <span className="font-semibold">{benefit.title}:</span>{" "}
              {benefit.description}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
