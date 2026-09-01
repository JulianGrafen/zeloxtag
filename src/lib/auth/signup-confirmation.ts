import "server-only";

import { getSiteUrl } from "@/lib/auth/site-url";
import {
  isResendConfigured,
  sendSignupConfirmationEmail,
} from "@/lib/email/resend";
import { logServerError } from "@/lib/security/public-error";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type RegisterAccountResult =
  | { status: "session"; userId: string; created: boolean }
  | { status: "confirm_email"; message: string }
  | { status: "error"; message: string };

const CONFIRM_EMAIL_MESSAGE =
  "Bitte bestätige deine E-Mail über den Link in deinem Postfach, bevor du fortfährst.";

const CLAIM_CONFIRM_EMAIL_MESSAGE =
  "Bitte bestätige deine E-Mail über den Link in deinem Postfach. Danach wird der Tag automatisch verknüpft.";

function looksLikeExistingUser(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("already") ||
    lower.includes("registered") ||
    lower.includes("exists") ||
    lower.includes("bereits")
  );
}

function buildSignupConfirmUrl(
  siteUrl: string,
  hashedToken: string,
  redirectNext: string,
): string {
  const confirmUrl = new URL("/auth/confirm", siteUrl);
  confirmUrl.searchParams.set("token_hash", hashedToken);
  confirmUrl.searchParams.set("type", "signup");
  confirmUrl.searchParams.set("next", redirectNext);
  return confirmUrl.toString();
}

function buildMagicConfirmUrl(
  siteUrl: string,
  hashedToken: string,
  redirectNext: string,
): string {
  const confirmUrl = new URL("/auth/confirm", siteUrl);
  confirmUrl.searchParams.set("token_hash", hashedToken);
  confirmUrl.searchParams.set("type", "magiclink");
  confirmUrl.searchParams.set("next", redirectNext);
  return confirmUrl.toString();
}

async function sendResendSignupConfirmation(input: {
  email: string;
  password: string;
  name?: string | null;
  redirectNext: string;
  confirmMessage: string;
}): Promise<RegisterAccountResult> {
  if (!isSupabaseAdminConfigured()) {
    return {
      status: "error",
      message: "Registrierung ist serverseitig nicht konfiguriert.",
    };
  }
  if (!isResendConfigured()) {
    return {
      status: "error",
      message: "E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY).",
    };
  }

  const siteUrl = await getSiteUrl();
  const redirectNext = input.redirectNext.trim() || "/auth/continue";
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(redirectNext)}`;
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email: input.email,
    password: input.password,
    options: {
      data: input.name ? { name: input.name } : undefined,
      redirectTo,
    },
  });

  if (error || !data?.properties?.hashed_token) {
    if (error && looksLikeExistingUser(error.message)) {
      const supabase = await createClient();
      const { data: signedIn, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        });

      if (signedIn.session?.user) {
        return {
          status: "session",
          userId: signedIn.session.user.id,
          created: false,
        };
      }

      if (
        signInError?.message.toLowerCase().includes("email not confirmed") ||
        signInError?.message.toLowerCase().includes("not confirmed")
      ) {
        const retry = await admin.auth.admin.generateLink({
          type: "magiclink",
          email: input.email,
          options: { redirectTo },
        });

        if (retry.data?.properties?.hashed_token) {
          const confirmUrl = buildMagicConfirmUrl(
            siteUrl,
            retry.data.properties.hashed_token,
            redirectNext,
          );
          const sent = await sendSignupConfirmationEmail({
            to: input.email,
            confirmUrl,
          });
          if (!sent.ok) {
            logServerError("[signup-confirmation] resend failed", sent.message);
            return {
              status: "error",
              message: `E-Mail-Versand fehlgeschlagen: ${sent.message}`,
            };
          }
          return { status: "confirm_email", message: input.confirmMessage };
        }
      }

      return {
        status: "error",
        message:
          "Dieses Konto existiert bereits. Bitte anmelden oder Passwort zurücksetzen.",
      };
    }

    logServerError("[signup-confirmation] generateLink signup failed", error);
    return {
      status: "error",
      message: "Kontoanlage fehlgeschlagen. Bitte erneut versuchen.",
    };
  }

  const confirmUrl = buildSignupConfirmUrl(
    siteUrl,
    data.properties.hashed_token,
    redirectNext,
  );
  const sent = await sendSignupConfirmationEmail({
    to: input.email,
    confirmUrl,
  });

  if (!sent.ok) {
    logServerError("[signup-confirmation] resend failed", sent.message);
    return {
      status: "error",
      message: `E-Mail-Versand fehlgeschlagen: ${sent.message}`,
    };
  }

  return { status: "confirm_email", message: input.confirmMessage };
}

async function registerViaSupabaseSignUp(input: {
  email: string;
  password: string;
  name?: string | null;
  redirectNext: string;
  confirmMessage: string;
}): Promise<RegisterAccountResult> {
  const siteUrl = await getSiteUrl();
  const redirectNext = input.redirectNext.trim() || "/auth/continue";
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: input.name ? { name: input.name } : undefined,
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(redirectNext)}`,
    },
  });

  if (data.session?.user) {
    return {
      status: "session",
      userId: data.session.user.id,
      created: true,
    };
  }

  if (data.user && !data.session) {
    return { status: "confirm_email", message: input.confirmMessage };
  }

  if (error && looksLikeExistingUser(error.message)) {
    const { data: signedIn, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
    if (signedIn.session?.user) {
      return {
        status: "session",
        userId: signedIn.session.user.id,
        created: false,
      };
    }
    if (signInError) {
      return {
        status: "error",
        message:
          "Dieses Konto existiert bereits. Bitte anmelden oder Passwort zurücksetzen.",
      };
    }
  }

  if (error) {
    logServerError("[signup-confirmation] signUp failed", error);
    return { status: "error", message: error.message };
  }

  return {
    status: "error",
    message: "Kontoanlage fehlgeschlagen. Bitte erneut versuchen.",
  };
}

/**
 * Creates an account and sends a signup confirmation email via Resend when
 * configured. Falls back to Supabase signUp (requires Supabase SMTP).
 */
export async function registerAccountWithConfirmation(input: {
  email: string;
  password: string;
  name?: string | null;
  redirectNext?: string;
  /** Copy shown after the confirmation email is queued. */
  confirmMessage?: string;
  /** When true, prefer Resend even if Supabase would return a session. */
  preferResendConfirmation?: boolean;
}): Promise<RegisterAccountResult> {
  const redirectNext = input.redirectNext?.trim() || "/auth/continue";
  const confirmMessage = input.confirmMessage?.trim() || CONFIRM_EMAIL_MESSAGE;

  if (
    input.preferResendConfirmation !== false &&
    isSupabaseAdminConfigured() &&
    isResendConfigured()
  ) {
    return sendResendSignupConfirmation({
      email: input.email,
      password: input.password,
      name: input.name,
      redirectNext,
      confirmMessage,
    });
  }

  return registerViaSupabaseSignUp({
    email: input.email,
    password: input.password,
    name: input.name,
    redirectNext,
    confirmMessage,
  });
}

export { CLAIM_CONFIRM_EMAIL_MESSAGE, CONFIRM_EMAIL_MESSAGE };
