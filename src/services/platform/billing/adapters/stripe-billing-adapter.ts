"use client";

import {
  startStripeCheckoutAction,
  startStripePortalAction,
} from "@/actions/stripe-checkout";

import type { IBillingService } from "@/services/platform/billing/billing-service";
import type {
  BillingPlanType,
  BillingPurchaseContext,
  BillingRestoreResult,
  BillingResult,
} from "@/services/platform/billing/billing-types";
import { mapPlanTypeToProInterval } from "@/services/platform/billing/plan-type";

export class StripeBillingAdapter implements IBillingService {
  async purchasePlan(
    planType: BillingPlanType,
    context: BillingPurchaseContext,
  ): Promise<BillingResult> {
    const interval = mapPlanTypeToProInterval(planType);
    const result = await startStripeCheckoutAction({
      successPath: context.successPath,
      cancelPath: context.cancelPath,
      interval,
    });

    if (result.status === "ok") {
      window.location.assign(result.url);
      return { status: "redirected" };
    }
    if (result.status === "active") {
      window.location.assign(context.successPath);
      return { status: "already_entitled" };
    }
    return { status: "error", message: result.message };
  }

  async restorePurchases(context?: {
    returnPath?: string;
  }): Promise<BillingRestoreResult> {
    const returnPath = context?.returnPath ?? "/settings";
    const result = await startStripePortalAction({ returnPath });
    if (result.status === "ok") {
      window.location.assign(result.url);
      return { status: "redirected" };
    }
    if (result.message.includes("Kein Stripe-Kunde")) {
      return { status: "nothing_to_restore" };
    }
    return { status: "error", message: result.message };
  }
}
