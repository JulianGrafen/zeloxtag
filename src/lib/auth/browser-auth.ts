"use client";

import { z } from "zod";

import { createClient } from "@/lib/supabase/client";

const emailSchema = z.string().trim().email().max(320);
const passwordSchema = z.string().min(10).max(128);

export type BrowserAuthResult =
  | { status: "signed_in" }
  | { status: "confirm_email"; email: string }
  | { status: "error"; message: string };

function normalizeNext(nextPath: string): string {
  if (nextPath.startsWith("/") && !nextPath.startsWith("//")) {
    return nextPath.slice(0, 512);
  }
  return "/dashboard";
}

function callbackUrl(nextPath: string): string {
  const origin = window.location.origin;
  const next = encodeURIComponent(normalizeNext(nextPath));
  return `${origin}/auth/callback?next=${next}`;
}

/**
 * Sign up from the browser so email-confirm links keep a valid PKCE verifier.
 */
export async function signUpWithPasswordBrowser(
  emailRaw: string,
  passwordRaw: string,
  nextPath = "/dashboard",
): Promise<BrowserAuthResult> {
  const emailParsed = emailSchema.safeParse(emailRaw);
  const passwordParsed = passwordSchema.safeParse(passwordRaw);
  if (!emailParsed.success) {
    return { status: "error", message: "Gültige E-Mail erforderlich." };
  }
  if (!passwordParsed.success) {
    return {
      status: "error",
      message: "Passwort muss mindestens 10 Zeichen haben.",
    };
  }

  const email = emailParsed.data.toLowerCase();
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: passwordParsed.data,
    options: {
      emailRedirectTo: callbackUrl(nextPath),
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  if (!data.session) {
    return { status: "confirm_email", email };
  }

  return { status: "signed_in" };
}
