import { headers } from "next/headers";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  CLAIM_CONFIRM_EMAIL_MESSAGE,
  registerAccountWithConfirmation,
} from "@/lib/auth/signup-confirmation";
import {
  authClientKeyFromHeaders,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";

const emailSchema = z.string().trim().email().max(320);
const passwordSchema = z.string().min(10).max(128);

export type EnsureClaimAccountResult =
  | { ok: true; userId: string; created: boolean }
  | { ok: false; message: string; needsEmailConfirmation?: boolean };

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

  const result = await registerAccountWithConfirmation({
    email,
    password,
    name,
    redirectNext: "/auth/continue",
    confirmMessage: CLAIM_CONFIRM_EMAIL_MESSAGE,
  });

  if (result.status === "session") {
    return {
      ok: true,
      userId: result.userId,
      created: result.created,
    };
  }

  if (result.status === "confirm_email") {
    return {
      ok: false,
      needsEmailConfirmation: true,
      message: result.message,
    };
  }

  if (result.message === GENERIC_EXISTING_ACCOUNT) {
    return { ok: false, message: result.message };
  }

  return { ok: false, message: result.message };
}
