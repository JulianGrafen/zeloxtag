import { afterEach, describe, expect, it, vi } from "vitest";

import { StripeBillingAdapter } from "@/services/platform/billing/adapters/stripe-billing-adapter";

vi.mock("@/actions/stripe-checkout", () => ({
  startStripeCheckoutAction: vi.fn(),
  startStripePortalAction: vi.fn(),
}));

import {
  startStripeCheckoutAction,
  startStripePortalAction,
} from "@/actions/stripe-checkout";

describe("StripeBillingAdapter", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  function stubWindowLocation() {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
    return assign;
  }

  it("redirects on successful checkout", async () => {
    const assign = stubWindowLocation();

    vi.mocked(startStripeCheckoutAction).mockResolvedValue({
      status: "ok",
      url: "https://checkout.stripe.com/test",
    });

    const adapter = new StripeBillingAdapter();
    const result = await adapter.purchasePlan("monthly", {
      successPath: "/ok",
      cancelPath: "/cancel",
    });

    expect(result).toEqual({ status: "redirected" });
    expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/test");
    expect(startStripeCheckoutAction).toHaveBeenCalledWith({
      successPath: "/ok",
      cancelPath: "/cancel",
      interval: "monthly",
    });
  });

  it("maps yearly to annual interval", async () => {
    vi.mocked(startStripeCheckoutAction).mockResolvedValue({
      status: "active",
    });
    stubWindowLocation();

    const adapter = new StripeBillingAdapter();
    await adapter.purchasePlan("yearly", {
      successPath: "/ok",
      cancelPath: "/cancel",
    });

    expect(startStripeCheckoutAction).toHaveBeenCalledWith(
      expect.objectContaining({ interval: "annual" }),
    );
  });

  it("opens portal on restore", async () => {
    vi.mocked(startStripePortalAction).mockResolvedValue({
      status: "ok",
      url: "https://billing.stripe.com/portal",
    });
    const assign = stubWindowLocation();

    const adapter = new StripeBillingAdapter();
    const result = await adapter.restorePurchases({ returnPath: "/settings" });

    expect(result).toEqual({ status: "redirected" });
    expect(assign).toHaveBeenCalledWith("https://billing.stripe.com/portal");
  });
});
