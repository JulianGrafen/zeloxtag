"use server";

import { redirect } from "next/navigation";

import { getSiteUrl } from "@/lib/auth/site-url";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type MagicLinkResult =
  | { status: "sent"; email: string }
  | { status: "error"; message: string }
  | { status: "unconfigured" };

/**
 * Sends a Supabase Magic Link to the given email.
 */
export async function sendMagicLink(
  emailRaw: string,
  nextPath = "/",
): Promise<MagicLinkResult> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { status: "error", message: "Gültige E-Mail erforderlich." };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return { status: "unconfigured" };
  }

  const safeNext = nextPath.startsWith("/") ? nextPath : "/";
  const siteUrl = await getSiteUrl();
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "sent", email };
}

export async function signOut(): Promise<void> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    redirect("/");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
