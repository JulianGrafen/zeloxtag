"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-user";
import { claimMembershipForUser } from "@/lib/billing/membership-store";

export type ClaimMembershipResult =
  | { status: "ok" }
  | { status: "sent" }
  | { status: "error"; message: string };

export async function claimMembershipAction(
  formData: FormData,
): Promise<ClaimMembershipResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Bitte zuerst anmelden." };
  }

  const result = await claimMembershipForUser(user.id, {
    shopifyEmail: String(formData.get("shopifyEmail") ?? ""),
    loginEmail: user.email,
  });

  if (result.status === "ok") {
    revalidatePath("/settings");
  }
  return result;
}
