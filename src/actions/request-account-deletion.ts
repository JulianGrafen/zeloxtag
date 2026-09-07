"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requestAccountDeletion } from "@/lib/account/account-lifecycle";
import { accountHasPasswordLogin } from "@/lib/auth/account-password";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type RequestAccountDeletionResult =
  | { status: "ok"; graceEndsAt: string }
  | { status: "error"; message: string };

const emailSchema = z.string().trim().email().max(320);

export async function requestAccountDeletionAction(input: {
  confirmEmail: string;
  password?: string | null;
}): Promise<RequestAccountDeletionResult> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return { status: "error", message: "Supabase ist nicht konfiguriert." };
  }

  const user = await getCurrentUser();
  if (!user?.email) {
    return { status: "error", message: "Bitte anmelden." };
  }

  const emailParsed = emailSchema.safeParse(input.confirmEmail);
  if (!emailParsed.success) {
    return { status: "error", message: "Bitte gib deine E-Mail-Adresse ein." };
  }
  if (emailParsed.data.toLowerCase() !== user.email.toLowerCase()) {
    return {
      status: "error",
      message: "Die E-Mail stimmt nicht mit deinem Konto überein.",
    };
  }

  const hasPasswordLogin = accountHasPasswordLogin(user);
  if (hasPasswordLogin) {
    const password = input.password?.trim() ?? "";
    if (!password) {
      return {
        status: "error",
        message: "Bitte gib dein Passwort zur Bestätigung ein.",
      };
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (error) {
      return { status: "error", message: "Passwort ist falsch." };
    }
  }

  const result = await requestAccountDeletion(user.id);
  if (result.status === "error") {
    return result;
  }

  revalidatePath("/settings");
  return {
    status: "ok",
    graceEndsAt: result.state.graceEndsAt ?? "",
  };
}
