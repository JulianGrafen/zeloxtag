import type { ProBillingInterval } from "@/lib/billing/pro-plan";

import type { BillingPlanType } from "@/services/platform/billing/billing-types";

export function mapPlanTypeToProInterval(
  planType: BillingPlanType,
): ProBillingInterval {
  return planType === "yearly" ? "annual" : "monthly";
}

export function mapProIntervalToPlanType(
  interval: ProBillingInterval,
): BillingPlanType {
  return interval === "annual" ? "yearly" : "monthly";
}
