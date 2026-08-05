"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { isGenericPostLoginNext } from "@/lib/auth/post-login-path";
import {
  clientIpFromHeaders,
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
  | { status: "verified"; redirectTo?: string }
  | { status: "ok"; message?: string }
  | { status: "factors"; factors: Array<{ id: string; friendlyName: string | null }> }
  | { status: "error"; message: string }
  | { status: "unconfigured" }
  | { status: "rate_limited"; retryAfterSec: number };

const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Code must be 6 digits");

const nextPathSchema = z
  .string()
  .max(512)
  .refine((value) => value.startsWith("/") && !value.startsWith("//"));

async function enforceMfaRateLimit(scope: string): Promise<MfaActionResult | null> {
  const headerStore = await headers();
  const ip = clientIpFromHeaders(headerStore);
  const cfg = RATE_LIMITS.auth;
  const result = rateLimit({
    key: `mfa:${scope}:${ip}`,
    limit: cfg.limit,
    windowMs: cfg.windowMs,
  });
  if (!result.ok) {
    return { status: "rate_limited", retryAfterSec: result.retryAfterSec };
  }
  return null;
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

  return { status: "verified" };
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
  const redirectTo =
    !user?.id || isGenericPostLoginNext(requested)
      ? "/auth/continue"
      : requested;

  return { status: "verified", redirectTo };
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

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { status: "error", message: error.message };
  return { status: "ok", message: "MFA-Faktor entfernt." };
}
