import type { AppPlatform } from "@/services/platform/types";

export type RevenueCatPackageKind = "monthly" | "yearly";

function readEnv(key: string): string | null {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

export function isNativeBillingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_BILLING_NATIVE_ENABLED === "1";
}

export function resolveRevenueCatApiKey(platform: AppPlatform): string | null {
  if (platform === "ios") {
    return readEnv("NEXT_PUBLIC_REVENUECAT_IOS_KEY");
  }
  if (platform === "android") {
    return readEnv("NEXT_PUBLIC_REVENUECAT_ANDROID_KEY");
  }
  return null;
}

/** RevenueCat package identifier inside the current offering (not store product id). */
export function resolveRevenueCatPackageIdentifier(
  kind: RevenueCatPackageKind,
): string {
  const monthly =
    readEnv("NEXT_PUBLIC_REVENUECAT_PACKAGE_MONTHLY") ?? "monthly";
  const yearly = readEnv("NEXT_PUBLIC_REVENUECAT_PACKAGE_YEARLY") ?? "yearly";
  return kind === "yearly" ? yearly : monthly;
}
