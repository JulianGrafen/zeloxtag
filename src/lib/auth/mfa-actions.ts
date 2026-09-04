"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { isGenericPostLoginNext } from "@/lib/auth/post-login-path";
import { resolveInsiderVehiclePath } from "@/lib/auth/resolve-insider-vehicle-path";
import {
  adminRemoveTotpFactors,
  consumeRecoveryCode,
  countUnusedRecoveryCodes,
  generateRecoveryCodes,
  replaceRecoveryCodesForUser,
} from "@/lib/auth/mfa-recovery";
import {
  authClientKeyFromHeaders,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type MfaActionResult =
  | {
      status: "enrolled";
      factorId: string;
      qrCode: string;
      secret: string;
    }
  | {
      status: "verified";
      redirectTo?: string;
      /** Shown once after first enrollment / regeneration. */
      recoveryCodes?: string[];
    }
  | {
      status: "recovered";
      /** Password login required again — MFA factors were removed. */
      redirectTo: string;
      message: string;
    }
  | {
      status: "recovery_status";
      unusedCount: number;
      hasTotp: boolean;
    }
  | { status: "ok"; message?: string; recoveryCodes?: string[] }
  | { status: "factors"; factors: Array<{ id: string; friendlyName: string | null }> }
  | { status: "error"; message: string }
  | { status: "unconfigured" }
  | { status: "rate_limited"; retryAfterSec: number };

const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Code must be 6 digits");

const recoveryCodeSchema = z
  .string()
  .trim()
  .min(8)
  .max(20);

const nextPathSchema = z
  .string()
  .max(512)
  .refine((value) => value.startsWith("/") && !value.startsWith("//"));

async function enforceMfaRateLimit(scope: string): Promise<MfaActionResult | null> {
  try {
    const headerStore = await headers();
    const clientKey = authClientKeyFromHeaders(headerStore);
    const cfg = RATE_LIMITS.auth;
    const result = await rateLimit({
      key: `mfa:${scope}:${clientKey}`,
      limit: cfg.limit,
      windowMs: cfg.windowMs,
    });
    if (!result.ok) {
      return { status: "rate_limited", retryAfterSec: result.retryAfterSec };
    }
    return null;
  } catch (error) {
    console.error("[mfa] rate limit skipped", error);
    return null;
  }
}

export async function listMfaFactors(): Promise<MfaActionResult> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Nicht angemeldet." };

  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return { status: "error", message: error.message };

  const factors = (data.totp ?? []).map((factor) => ({
    id: factor.id,
    friendlyName: factor.friendly_name ?? null,
  }));
  return { status: "factors", factors };
}

export async function getMfaRecoveryStatus(): Promise<MfaActionResult> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Nicht angemeldet." };

  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return { status: "error", message: error.message };

  const hasTotp = (data.totp ?? []).some((factor) => factor.status === "verified");
  const unusedCount = await countUnusedRecoveryCodes(user.id);

  return { status: "recovery_status", unusedCount, hasTotp };
}

export async function enrollTotp(
  friendlyName = "Authenticator",
): Promise<MfaActionResult> {
  const limited = await enforceMfaRateLimit("enroll");
  if (limited) return limited;

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Nicht angemeldet." };

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: friendlyName.slice(0, 64),
  });

  if (error || !data) {
    return { status: "error", message: error?.message ?? "MFA-Enroll fehlgeschlagen." };
  }

  return {
    status: "enrolled",
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export async function verifyTotpEnrollment(
  factorId: string,
  codeRaw: string,
): Promise<MfaActionResult> {
  const limited = await enforceMfaRateLimit("verify-enroll");
  if (limited) return limited;

  const codeParsed = totpCodeSchema.safeParse(codeRaw);
  if (!codeParsed.success) {
    return { status: "error", message: "Ungültiger 6-stelliger Code." };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Nicht angemeldet." };

  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) {
    return {
      status: "error",
      message: challenge.error?.message ?? "Challenge fehlgeschlagen.",
    };
  }

  const verified = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: codeParsed.data,
  });

  if (verified.error) {
    return { status: "error", message: verified.error.message };
  }

  try {
    const recoveryCodes = generateRecoveryCodes();
    await replaceRecoveryCodesForUser(user.id, recoveryCodes);
    return { status: "verified", recoveryCodes };
  } catch {
    return {
      status: "verified",
      recoveryCodes: undefined,
    };
  }
}

/** Complete MFA challenge during login (AAL1 → AAL2). */
export async function verifyMfaLogin(
  codeRaw: string,
  nextPath = "/dashboard",
): Promise<MfaActionResult> {
  const limited = await enforceMfaRateLimit("verify-login");
  if (limited) return limited;

  const codeParsed = totpCodeSchema.safeParse(codeRaw);
  if (!codeParsed.success) {
    return { status: "error", message: "Ungültiger 6-stelliger Code." };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { status: "error", message: listError.message };

  const factor = factors.totp.find((item) => item.status === "verified");
  if (!factor) {
    return { status: "error", message: "Kein verifizierter TOTP-Faktor gefunden." };
  }

  const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (challenge.error || !challenge.data) {
    return {
      status: "error",
      message: challenge.error?.message ?? "Challenge fehlgeschlagen.",
    };
  }

  const verified = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.data.id,
    code: codeParsed.data,
  });

  if (verified.error) {
    return { status: "error", message: verified.error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const next = nextPathSchema.safeParse(nextPath);
  const requested = next.success ? next.data : "/auth/continue";
  let redirectTo =
    !user?.id || isGenericPostLoginNext(requested)
      ? "/auth/continue"
      : requested;

  if (user?.id && !isGenericPostLoginNext(requested)) {
    const insiderPath = await resolveInsiderVehiclePath(requested, user.id);
    if (insiderPath) {
      redirectTo = insiderPath;
    }
  }

  return { status: "verified", redirectTo };
}

/**
 * Lost authenticator: consume a one-time recovery code, remove TOTP factors,
 * sign out (Supabase invalidates sessions on factor delete), then password login.
 */
export async function verifyMfaRecoveryCode(
  codeRaw: string,
): Promise<MfaActionResult> {
  const limited = await enforceMfaRateLimit("verify-recovery");
  if (limited) return limited;

  const codeParsed = recoveryCodeSchema.safeParse(codeRaw);
  if (!codeParsed.success) {
    return { status: "error", message: "Ungültiger Recovery-Code." };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Bitte zuerst mit E-Mail und Passwort anmelden." };
  }

  const consumed = await consumeRecoveryCode(user.id, codeParsed.data);
  if (!consumed) {
    return { status: "error", message: "Recovery-Code ungültig oder bereits verwendet." };
  }

  try {
    await adminRemoveTotpFactors(user.id);
    // Invalidate leftover codes — recovery ends this MFA enrollment.
    await replaceRecoveryCodesForUser(user.id, []);
  } catch {
    return {
      status: "error",
      message:
        "Recovery-Code wurde verbraucht, aber 2FA konnte nicht entfernt werden. Support kontaktieren.",
    };
  }

  await supabase.auth.signOut();

  return {
    status: "recovered",
    redirectTo: "/login?recovered=1",
    message:
      "2FA wurde mit dem Recovery-Code deaktiviert. Melde dich erneut an und richte 2FA neu ein.",
  };
}

/** Regenerate recovery codes (AAL2 only). Previous unused codes are invalidated. */
export async function regenerateMfaRecoveryCodes(): Promise<MfaActionResult> {
  const limited = await enforceMfaRateLimit("regenerate-recovery");
  if (limited) return limited;

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Nicht angemeldet." };

  const { data: aal, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError) return { status: "error", message: aalError.message };
  if (aal?.currentLevel !== "aal2") {
    return {
      status: "error",
      message: "MFA-Bestätigung erforderlich, um Recovery-Codes zu erneuern.",
    };
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasTotp = (factors?.totp ?? []).some((factor) => factor.status === "verified");
  if (!hasTotp) {
    return { status: "error", message: "Zuerst 2FA aktivieren." };
  }

  try {
    const recoveryCodes = generateRecoveryCodes();
    await replaceRecoveryCodesForUser(user.id, recoveryCodes);
    return {
      status: "ok",
      message: "Neue Recovery-Codes erzeugt. Alte Codes sind ungültig.",
      recoveryCodes,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Recovery-Codes konnten nicht erzeugt werden.",
    };
  }
}

export async function unenrollTotp(factorId: string): Promise<MfaActionResult> {
  const limited = await enforceMfaRateLimit("unenroll");
  if (limited) return limited;

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return { status: "unconfigured" };

  const supabase = await createClient();

  // Step-up: only AAL2 sessions may remove TOTP (stolen AAL1 cookie ≠ enough).
  const { data: aal, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError) {
    return { status: "error", message: aalError.message };
  }
  if (aal?.currentLevel !== "aal2") {
    return {
      status: "error",
      message:
        "MFA-Bestätigung erforderlich, bevor der Faktor entfernt werden kann.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { status: "error", message: error.message };

  // Drop leftover recovery codes when MFA is fully removed.
  if (user) {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const stillHasTotp = (factors?.totp ?? []).some(
        (factor) => factor.status === "verified",
      );
      if (!stillHasTotp) {
        await replaceRecoveryCodesForUser(user.id, []);
      }
    } catch {
      /* non-fatal */
    }
  }

  return { status: "ok", message: "MFA-Faktor entfernt." };
}
