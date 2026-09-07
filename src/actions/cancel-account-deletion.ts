"use server";

import { revalidatePath } from "next/cache";

import { cancelAccountDeletion } from "@/lib/account/account-lifecycle";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type CancelAccountDeletionResult =
  | { status: "ok" }
  | { status: "error"; message: string };

export async function cancelAccountDeletionAction(): Promise<CancelAccountDeletionResult> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return { status: "error", message: "Supabase ist nicht konfiguriert." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Bitte anmelden." };
  }

  const result = await cancelAccountDeletion(user.id);
  if (result.status === "error") {
    return result;
  }

  revalidatePath("/settings");
  return { status: "ok" };
}
