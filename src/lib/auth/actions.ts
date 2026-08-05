"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isGenericPostLoginNext } from "@/lib/auth/post-login-path";
import {
  clientIpFromHeaders,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AuthActionResult =
  | { status: "ok"; message?: string; redirectTo?: string }
  | { status: "mfa_required" }
  | { status: "error"; message: string }
  | { status: "unconfigured" }
  | { status: "rate_limited"; retryAfterSec: number };

const emailSchema = z.string().trim().email().max(320);
const passwordSchema = z.string().min(10).max(128);
const nextPathSchema = z
  .string()
  .max(512)
  .refine((value) => value.startsWith("/") && !value.startsWith("//"), {
    message: "Invalid redirect path",
  });

async function enforceAuthRateLimit(scope: string): Promise<AuthActionResult | null> {
  const headerStore = await headers();
  const ip = clientIpFromHeaders(headerStore);
  const cfg = RATE_LIMITS.auth;
  const result = rateLimit({
    key: `auth:${scope}:${ip}`,
    limit: cfg.limit,
    windowMs: cfg.windowMs,
  });
  if (!result.ok) {
    return { status: "rate_limited", retryAfterSec: result.retryAfterSec };
  }
  return null;
}

function normalizeNext(nextPath: string): string {
  const parsed = nextPathSchema.safeParse(nextPath || "/auth/continue");
  return parsed.success ? parsed.data : "/auth/continue";
}

export async function signInWithPassword(
  emailRaw: string,
  passwordRaw: string,
  nextPath = "/auth/continue",
): Promise<AuthActionResult> {
  const limited = await enforceAuthRateLimit("password-login");
  if (limited) return limited;

  const emailParsed = emailSchema.safeParse(emailRaw);
  const passwordParsed = passwordSchema.safeParse(passwordRaw);
  if (!emailParsed.success || !passwordParsed.success) {
    return {
      status: "error",
      message: "E-Mail und Passwort (min. 10 Zeichen) erforderlich.",
    };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return { status: "unconfigured" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailParsed.data.toLowerCase(),
    password: passwordParsed.data,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
    return { status: "mfa_required" };
  }

  if (!data.session?.user?.id) {
    return { status: "error", message: "Anmeldung fehlgeschlagen." };
  }

  // Generic login → /auth/continue (fresh request, cookies committed).
  // Deep links (settings, claim, …) keep their explicit next path.
  const requested = normalizeNext(nextPath);
  const redirectTo = isGenericPostLoginNext(requested)
    ? "/auth/continue"
    : requested;

  return { status: "ok", redirectTo };
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

/** Sign out, then open login (for switching mixed sessions on a shared device). */
export async function signOutToLogin(nextPath = "/auth/continue"): Promise<void> {
  const safeNext = normalizeNext(nextPath);
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    redirect(`/login?next=${encodeURIComponent(safeNext)}`);
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/login?next=${encodeURIComponent(safeNext)}`);
}

/** Form-action wrapper: reads `next` from FormData. */
export async function signOutToLoginForm(formData: FormData): Promise<void> {
  const next = String(formData.get("next") ?? "/auth/continue");
  await signOutToLogin(next);
}
