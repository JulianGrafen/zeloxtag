"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isGenericPostLoginNext } from "@/lib/auth/post-login-path";
import { getSiteUrl } from "@/lib/auth/site-url";
import { isResendConfigured, sendPasswordResetEmail } from "@/lib/email/resend";
import {
  authClientKeyFromHeaders,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
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
  try {
    const headerStore = await headers();
    const clientKey = authClientKeyFromHeaders(headerStore);
    const cfg = RATE_LIMITS.auth;
    const result = await rateLimit({
      key: `auth:${scope}:${clientKey}`,
      limit: cfg.limit,
      windowMs: cfg.windowMs,
    });
    if (!result.ok) {
      return { status: "rate_limited", retryAfterSec: result.retryAfterSec };
    }
    return null;
  } catch (error) {
    // Fail open — auth must remain reachable.
    console.error("[auth] rate limit skipped", error);
    return null;
  }
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

/**
 * Password signup via Server Action so session cookies are HttpOnly.
 * If Supabase requires email confirmation, the service role confirms immediately
 * so onboarding stays seamless (no inbox confirm step).
 */
export async function signUpWithPassword(
  emailRaw: string,
  passwordRaw: string,
  nextPath = "/auth/continue",
): Promise<AuthActionResult> {
  const limited = await enforceAuthRateLimit("password-signup");
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

  const email = emailParsed.data.toLowerCase();
  const password = passwordParsed.data;
  const next = normalizeNext(nextPath);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  if (!data.session) {
    if (!data.user || !isSupabaseAdminConfigured()) {
      return {
        status: "error",
        message:
          "Konto angelegt, aber keine Sitzung. SUPABASE_SERVICE_ROLE_KEY setzen oder E-Mail-Confirm in Supabase deaktivieren.",
      };
    }

    const admin = createAdminClient();
    const confirmed = await admin.auth.admin.updateUserById(data.user.id, {
      email_confirm: true,
    });
    if (confirmed.error) {
      return { status: "error", message: confirmed.error.message };
    }

    const { data: signedIn, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !signedIn.session) {
      return {
        status: "error",
        message:
          signInError?.message ?? "Anmeldung nach Kontoanlage fehlgeschlagen.",
      };
    }
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
    return { status: "mfa_required" };
  }

  const redirectTo = isGenericPostLoginNext(next)
    ? "/auth/continue"
    : next;

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

const GENERIC_RESET_OK =
  "Wenn ein Konto mit dieser E-Mail existiert, erhältst du gleich einen Link zum Zurücksetzen.";

/**
 * Password reset via Supabase recovery token + Resend email.
 * Always returns a generic success message (no account enumeration).
 */
export async function requestPasswordReset(
  emailRaw: string,
): Promise<AuthActionResult> {
  const limited = await enforceAuthRateLimit("password-reset");
  if (limited) return limited;

  const emailParsed = emailSchema.safeParse(emailRaw);
  if (!emailParsed.success) {
    return { status: "error", message: "Gültige E-Mail erforderlich." };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return { status: "unconfigured" };
  if (!isSupabaseAdminConfigured()) {
    return {
      status: "error",
      message: "Passwort-Reset ist serverseitig nicht konfiguriert.",
    };
  }
  if (!isResendConfigured()) {
    return {
      status: "error",
      message: "E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY).",
    };
  }

  const email = emailParsed.data.toLowerCase();
  const siteUrl = await getSiteUrl();
  const redirectTo = `${siteUrl}/login/update-password`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    // Unknown / invalid email → same generic success (no enumeration).
    if (error || !data?.properties?.hashed_token) {
      return { status: "ok", message: GENERIC_RESET_OK };
    }

    const resetUrl = new URL("/auth/confirm", siteUrl);
    resetUrl.searchParams.set("token_hash", data.properties.hashed_token);
    resetUrl.searchParams.set("type", "recovery");
    resetUrl.searchParams.set("next", "/login/update-password");

    const sent = await sendPasswordResetEmail({
      to: email,
      resetUrl: resetUrl.toString(),
    });

    if (!sent.ok) {
      console.error("[password-reset] Resend failed:", sent.message);
      // Surface provider/config errors so ops can fix FROM/domain/API key.
      // (Unknown emails never reach send — they already returned GENERIC_RESET_OK.)
      return {
        status: "error",
        message: `E-Mail-Versand fehlgeschlagen: ${sent.message}`,
      };
    }

    return { status: "ok", message: GENERIC_RESET_OK };
  } catch (error) {
    console.error("[password-reset] unexpected error", error);
    return { status: "ok", message: GENERIC_RESET_OK };
  }
}

/** Set a new password after recovery link verification (authenticated session). */
export async function updatePasswordAfterReset(
  passwordRaw: string,
  passwordConfirmRaw: string,
): Promise<AuthActionResult> {
  const limited = await enforceAuthRateLimit("password-update");
  if (limited) return limited;

  const passwordParsed = passwordSchema.safeParse(passwordRaw);
  if (!passwordParsed.success) {
    return {
      status: "error",
      message: "Passwort muss mindestens 10 Zeichen haben.",
    };
  }
  if (passwordRaw !== passwordConfirmRaw) {
    return { status: "error", message: "Passwörter stimmen nicht überein." };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      status: "error",
      message: "Sitzung abgelaufen. Bitte erneut den Link aus der E-Mail öffnen.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: passwordParsed.data,
  });
  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "ok",
    message: "Passwort aktualisiert.",
    redirectTo: "/auth/continue",
  };
}
