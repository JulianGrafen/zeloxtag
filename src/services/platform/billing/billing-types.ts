export type BillingPlanType = "monthly" | "yearly";

export type BillingPurchaseContext = {
  successPath: string;
  cancelPath: string;
};

export type BillingResult =
  | { status: "redirected" }
  | { status: "completed" }
  | { status: "already_entitled" }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export type BillingRestoreResult =
  | { status: "restored" }
  | { status: "nothing_to_restore" }
  | { status: "redirected" }
  | { status: "error"; message: string };
