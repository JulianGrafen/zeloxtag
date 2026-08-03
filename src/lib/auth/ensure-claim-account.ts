import { headers } from "next/headers";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  clientIpFromHeaders,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email().max(320);
const passwordSchema = z.string().min(10).max(128);

export type EnsureClaimAccountResult =
  | { ok: true; userId: string; created: boolean }
  | { ok: false; message: string };

function looksLikeExistingUser(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("already") ||
    lower.includes("registered") ||
    lower.includes("exists") ||
    lower.includes("bereits")
  );
}

/**
 * Ensures the claiming user has a Supabase Auth session.
 * — Already signed in → reuse session
 * — New email → create account + sign in (admin-confirms email for QR onboarding)
 * — Existing email → sign in with password
 */
export async function ensureClaimAccount(input: {
  email: string;
  password: string;
  name?: string | null;
}): Promise<EnsureClaimAccountResult> {
  const headerStore = await headers();
  const ip = clientIpFromHeaders(headerStore);
  const limited = rateLimit({
    key: `auth:claim-account:${ip}`,
    limit: RATE_LIMITS.auth.limit,
    windowMs: RATE_LIMITS.auth.windowMs,
  });
  if (!limited.ok) {
    return {
      ok: false,
      message: `Zu viele Versuche. Bitte in ${limited.retryAfterSec}s erneut versuchen.`,
    };
  }

  const emailParsed = emailSchema.safeParse(input.email);
  const passwordParsed = passwordSchema.safeParse(input.password);
  if (!emailParsed.success) {
    return { ok: false, message: "Gültige E-Mail erforderlich." };
  }
  if (!passwordParsed.success) {
    return { ok: false, message: "Passwort muss mindestens 10 Zeichen haben." };
  }

  const email = emailParsed.data.toLowerCase();
  const password = passwordParsed.data;
  const name = input.name?.trim() || null;

  const existing = await getCurrentUser();
  if (existing) {
    return { ok: true, userId: existing.id, created: false };
  }

  const supabase = await createClient();

  const { data: signedUp, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: name ? { name } : undefined,
    },
  });

  if (signedUp.session?.user) {
    return { ok: true, userId: signedUp.session.user.id, created: true };
  }

  // Email confirmation required — confirm via service role, then sign in.
  if (signedUp.user && !signedUp.session && isSupabaseAdminConfigured()) {
    const admin = createAdminClient();
    const confirmed = await admin.auth.admin.updateUserById(signedUp.user.id, {
      email_confirm: true,
      user_metadata: name ? { name } : undefined,
    });
    if (confirmed.error) {
      return { ok: false, message: confirmed.error.message };
    }

    const { data: signedIn, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !signedIn.user) {
      return {
        ok: false,
        message: signInError?.message ?? "Anmeldung nach Kontoanlage fehlgeschlagen.",
      };
    }
    return { ok: true, userId: signedIn.user.id, created: true };
  }

  if (signUpError && looksLikeExistingUser(signUpError.message)) {
    const { data: signedIn, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !signedIn.user) {
      return {
        ok: false,
        message:
          "Dieses Konto existiert bereits. Passwort prüfen oder über /login anmelden.",
      };
    }
    return { ok: true, userId: signedIn.user.id, created: false };
  }

  if (signUpError) {
    return { ok: false, message: signUpError.message };
  }

  // Fallback: admin create + sign-in (seamless first-scan onboarding).
  if (isSupabaseAdminConfigured()) {
    const admin = createAdminClient();
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: name ? { name } : undefined,
    });

    if (created.error || !created.data.user) {
      if (created.error && looksLikeExistingUser(created.error.message)) {
        const { data: signedIn, error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signInError || !signedIn.user) {
          return {
            ok: false,
            message:
              "Dieses Konto existiert bereits. Passwort prüfen oder über /login anmelden.",
          };
        }
        return { ok: true, userId: signedIn.user.id, created: false };
      }
      return {
        ok: false,
        message: created.error?.message ?? "Kontoanlage fehlgeschlagen.",
      };
    }

    const { data: signedIn, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !signedIn.user) {
      return {
        ok: false,
        message: signInError?.message ?? "Anmeldung nach Kontoanlage fehlgeschlagen.",
      };
    }
    return { ok: true, userId: signedIn.user.id, created: true };
  }

  return {
    ok: false,
    message:
      "Konto angelegt, aber E-Mail-Bestätigung ist aktiv. Bitte Postfach prüfen oder Service-Role für Auto-Confirm setzen.",
  };
}
