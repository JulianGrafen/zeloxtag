import type { IBillingService } from "@/services/platform/billing/billing-service";
import { RevenueCatBillingAdapter } from "@/services/platform/billing/adapters/revenuecat-billing-adapter";
import { StripeBillingAdapter } from "@/services/platform/billing/adapters/stripe-billing-adapter";
import type { PlatformSnapshot } from "@/services/platform/types";

export function createBillingService(
  snapshot: PlatformSnapshot,
): IBillingService {
  if (snapshot.isNativeApp) {
    return new RevenueCatBillingAdapter(snapshot.platform);
  }
  return new StripeBillingAdapter();
}
