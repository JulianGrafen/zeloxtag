"use client";

import {
  isNativeBillingEnabled,
  resolveRevenueCatApiKey,
  resolveRevenueCatPackageIdentifier,
  type RevenueCatPackageKind,
} from "@/lib/billing/revenuecat-config";

import type { IBillingService } from "@/services/platform/billing/billing-service";
import type {
  BillingPlanType,
  BillingPurchaseContext,
  BillingRestoreResult,
  BillingResult,
} from "@/services/platform/billing/billing-types";
import type { AppPlatform } from "@/services/platform/types";

type PurchasesModule = typeof import("@revenuecat/purchases-capacitor");

function planTypeToPackageKind(planType: BillingPlanType): RevenueCatPackageKind {
  return planType === "yearly" ? "yearly" : "monthly";
}

export class RevenueCatBillingAdapter implements IBillingService {
  private configured = false;
  private identifiedUserId: string | null = null;

  constructor(private readonly platform: AppPlatform) {}

  private async loadPurchases(): Promise<PurchasesModule> {
    return import("@revenuecat/purchases-capacitor");
  }

  private async ensureConfigured(): Promise<PurchasesModule["Purchases"]> {
    const apiKey = resolveRevenueCatApiKey(this.platform);
    if (!apiKey) {
      throw new Error("RevenueCat ist nicht konfiguriert.");
    }
    const module = await this.loadPurchases();
    if (!this.configured) {
      await module.Purchases.configure({ apiKey });
      this.configured = true;
    }
    return module.Purchases;
  }

  async identifyUser(userId: string): Promise<void> {
    const trimmed = userId.trim();
    if (!trimmed || this.identifiedUserId === trimmed) {
      return;
    }

    const Purchases = await this.ensureConfigured();
    await Purchases.logIn({ appUserID: trimmed });
    this.identifiedUserId = trimmed;
  }

  private ensureNativeBillingReady(): void {
    if (!isNativeBillingEnabled()) {
      throw new Error("In-App-Käufe sind noch nicht freigeschaltet.");
    }
    if (!resolveRevenueCatApiKey(this.platform)) {
      throw new Error("RevenueCat ist nicht konfiguriert.");
    }
  }

  async purchasePlan(
    planType: BillingPlanType,
    context: BillingPurchaseContext,
  ): Promise<BillingResult> {
    this.ensureNativeBillingReady();

    try {
      const Purchases = await this.ensureConfigured();
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (!current) {
        return {
          status: "error",
          message: "Keine Abo-Angebote verfügbar.",
        };
      }

      const packageId = resolveRevenueCatPackageIdentifier(
        planTypeToPackageKind(planType),
      );
      const selected =
        current.availablePackages.find(
          (pkg) => pkg.identifier === packageId,
        ) ?? current.availablePackages[0];

      if (!selected) {
        return {
          status: "error",
          message: "Abo-Paket nicht gefunden.",
        };
      }

      await Purchases.purchasePackage({ aPackage: selected });
      window.location.assign(context.successPath);
      return { status: "completed" };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Kauf fehlgeschlagen.";
      if (/cancel/i.test(message) || /user/i.test(message)) {
        return { status: "cancelled" };
      }
      return { status: "error", message };
    }
  }

  async restorePurchases(): Promise<BillingRestoreResult> {
    this.ensureNativeBillingReady();

    try {
      const Purchases = await this.ensureConfigured();
      const info = await Purchases.restorePurchases();
      const active =
        Object.keys(info.customerInfo.entitlements.active ?? {}).length > 0;
      if (!active) {
        return { status: "nothing_to_restore" };
      }
      return { status: "restored" };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Wiederherstellung fehlgeschlagen.";
      return { status: "error", message };
    }
  }
}
