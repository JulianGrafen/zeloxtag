import { headers } from "next/headers";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import { getSiteUrl } from "@/lib/auth/site-url";
import {
  authClientKeyFromHeaders,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email().max(320);
const passwordSchema = z.string().min(10).max(128);

export type EnsureClaimAccountResult =
  | { ok: true; userId: string; created: boolean }
  | { ok: false; message: string; needsEmailConfirmation?: boolean };

function looksLikeExistingUser(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("already") ||
    lower.includes("registered") ||
    lower.includes("exists") ||
    lower.includes("bereits")
  );
}

const GENERIC_EXISTING_ACCOUNT =
  "Dieses Konto existiert bereits. Bitte anmelden oder Passwort zurücksetzen.";

/**
 * Ensures the claiming user has a Supabase Auth session.
 * — Already signed in → reuse session
 * — New email → sign up (email must be confirmed before claim completes)
 * — Existing email → sign in with password
 */
export async function ensureClaimAccount(input: {
  email: string;
  password: string;
  name?: string | null;
}): Promise<EnsureClaimAccountResult> {
  try {
    const headerStore = await headers();
    const clientKey = authClientKeyFromHeaders(headerStore);
    const limited = await rateLimit({
      key: `auth:claim-account:${clientKey}`,
      limit: RATE_LIMITS.auth.limit,
      windowMs: RATE_LIMITS.auth.windowMs,
    });
    if (!limited.ok) {
      return {
        ok: false,
        message: `Zu viele Versuche. Bitte in ${limited.retryAfterSec}s erneut versuchen.`,
      };
    }
  } catch {
    return {
      ok: false,
      message:
        "Anmeldung vorübergehend nicht verfügbar. Bitte später erneut versuchen.",
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
  const siteUrl = await getSiteUrl();

  const { data: signedUp, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: name ? { name } : undefined,
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/auth/continue")}`,
    },
  });

  if (signedUp.session?.user) {
    return { ok: true, userId: signedUp.session.user.id, created: true };
  }

  if (signedUp.user && !signedUp.session) {
    return {
      ok: false,
      needsEmailConfirmation: true,
      message:
        "Bitte bestätige deine E-Mail über den Link in deinem Postfach. Danach wird der Tag automatisch verknüpft.",
    };
  }

  if (signUpError && looksLikeExistingUser(signUpError.message)) {
    const { data: signedIn, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !signedIn.user) {
      return {
        ok: false,
        message: GENERIC_EXISTING_ACCOUNT,
      };
    }
    return { ok: true, userId: signedIn.user.id, created: false };
  }

  if (signUpError) {
    return { ok: false, message: signUpError.message };
  }

  return {
    ok: false,
    message:
      "Kontoanlage fehlgeschlagen. Bitte erneut versuchen oder über /login anmelden.",
  };
}
