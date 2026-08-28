"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getSiteUrl } from "@/lib/auth/site-url";
import { isGenericPostLoginNext } from "@/lib/auth/post-login-path";
import { isResendConfigured, sendMagicLinkEmail, sendPasswordResetEmail } from "@/lib/email/resend";
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
  | { status: "confirm_email"; message: string }
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

  redirect(redirectTo);
}

/**
 * Password signup via Server Action so session cookies are HttpOnly.
 * When Supabase requires email confirmation, returns `confirm_email` instead
 * of bypassing inbox verification via the service role.
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
  const siteUrl = await getSiteUrl();

  const supabase = await createClient();
  const redirectNext = isGenericPostLoginNext(next)
    ? "/auth/continue"
    : next;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(redirectNext)}`,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  if (!data.session) {
    if (data.user) {
      return {
        status: "confirm_email",
        message:
          "Bitte bestätige deine E-Mail über den Link in deinem Postfach, bevor du fortfährst.",
      };
    }
    return {
      status: "error",
      message: "Kontoanlage fehlgeschlagen. Bitte erneut versuchen.",
    };
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
    return { status: "mfa_required" };
  }

  const redirectTo = isGenericPostLoginNext(next)
    ? "/auth/continue"
    : next;

  redirect(redirectTo);
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

const GENERIC_MAGIC_LINK_OK =
  "Wenn die E-Mail gültig ist, erhältst du gleich einen Anmelde-Link.";

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

/**
 * Only a pending Schrauber invite may bring a brand-new account into existence.
 * Without this check the unauthenticated magic-link action lets anyone create a
 * confirmed account for someone else's address and block their registration.
 */
async function inviteTokenAllowsAccountCreation(
  token: string | null | undefined,
): Promise<boolean> {
  const candidate = token?.trim() ?? "";
  if (candidate.length < 16) return false;

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("vehicle_contributors")
    .select("id, status, expires_at")
    .eq("invite_token", candidate)
    .maybeSingle();

  if (!invite || invite.status !== "invited") return false;
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return false;
  }
  return true;
}

async function ensureMagicLinkUser(
  email: string,
  mayCreateAccount: boolean,
): Promise<boolean> {
  const admin = createAdminClient();
  const existing = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (existing.data?.properties?.hashed_token) {
    return true;
  }

  if (!mayCreateAccount) {
    return false;
  }

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (created.error) {
    const message = created.error.message.toLowerCase();
    if (
      !message.includes("already") &&
      !message.includes("registered") &&
      !message.includes("exists")
    ) {
      return false;
    }
  }

  const retry = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  return Boolean(retry.data?.properties?.hashed_token);
}

/**
 * Passwordless login for Schrauber workshops — magic link via Resend.
 * A new account is only created when `inviteToken` names a pending invite;
 * otherwise existing users get a link and unknown addresses get the generic reply.
 */
export async function requestMagicLinkLogin(
  emailRaw: string,
  nextPath = "/auth/continue",
  vehicleLabel?: string | null,
  inviteToken?: string | null,
): Promise<AuthActionResult> {
  const limited = await enforceAuthRateLimit("magic-link");
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
      message: "Magic Link ist serverseitig nicht konfiguriert.",
    };
  }
  if (!isResendConfigured()) {
    return {
      status: "error",
      message: "E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY).",
    };
  }

  const email = emailParsed.data.toLowerCase();
  const next = normalizeNext(nextPath);
  const siteUrl = await getSiteUrl();

  try {
    const mayCreateAccount = await inviteTokenAllowsAccountCreation(inviteToken);
    const ready = await ensureMagicLinkUser(email, mayCreateAccount);
    if (!ready) {
      return { status: "ok", message: GENERIC_MAGIC_LINK_OK };
    }

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (error || !data?.properties?.hashed_token) {
      return { status: "ok", message: GENERIC_MAGIC_LINK_OK };
    }

    const magicUrl = new URL("/auth/confirm", siteUrl);
    magicUrl.searchParams.set("token_hash", data.properties.hashed_token);
    magicUrl.searchParams.set("type", "magiclink");
    magicUrl.searchParams.set("next", next);

    const sent = await sendMagicLinkEmail({
      to: email,
      loginUrl: magicUrl.toString(),
      vehicleLabel: vehicleLabel ?? null,
    });

    if (!sent.ok) {
      console.error("[magic-link] Resend failed:", sent.message);
      return {
        status: "error",
        message: `E-Mail-Versand fehlgeschlagen: ${sent.message}`,
      };
    }

    return { status: "ok", message: GENERIC_MAGIC_LINK_OK };
  } catch (error) {
    console.error("[magic-link] unexpected error", error);
    return { status: "ok", message: GENERIC_MAGIC_LINK_OK };
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
