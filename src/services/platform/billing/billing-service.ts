import type {
  BillingPlanType,
  BillingPurchaseContext,
  BillingRestoreResult,
  BillingResult,
} from "@/services/platform/billing/billing-types";

export interface IBillingService {
  purchasePlan(
    planType: BillingPlanType,
    context: BillingPurchaseContext,
  ): Promise<BillingResult>;

  restorePurchases(context?: { returnPath?: string }): Promise<BillingRestoreResult>;

  /** Native only — configure RevenueCat after auth (no-op on Stripe web). */
  identifyUser?(userId: string): Promise<void>;
}
