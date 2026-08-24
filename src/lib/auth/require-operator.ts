import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isSingleEmail(value: string): boolean {
  return Boolean(value) && value.includes("@") && !value.includes(",");
}

/**
 * Exactly one superuser may mint tags / download plaque SVGs.
 * Prefer ZELOXTAG_SUPERUSER_EMAIL. ZELOXTAG_OPERATOR_EMAILS is accepted only
 * when it contains a single address — a list locks the minter (fail closed).
 */
export function readSuperuserEmail(): string | null {
  const dedicated = normalizeEmail(process.env.ZELOXTAG_SUPERUSER_EMAIL ?? "");
  if (isSingleEmail(dedicated)) return dedicated;

  const entries = (process.env.ZELOXTAG_OPERATOR_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
  if (entries.length === 1 && isSingleEmail(entries[0] ?? "")) {
    return entries[0] ?? null;
  }
  return null;
}

export function isOperatorEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const superuser = readSuperuserEmail();
  if (!superuser) return false;
  return normalizeEmail(email) === superuser;
}

export type OperatorDenialCode =
  | "unauthenticated"
  | "superuser_not_configured"
  | "not_superuser"
  | "mfa_required"
  | "mfa_unavailable";

export type OperatorAccessResult =
  | { ok: true; email: string; userId: string }
  | {
      ok: false;
      status: 401 | 403;
      code: OperatorDenialCode;
      message: string;
    };

/**
 * Inventory / QR mint — fail closed unless the session is the sole superuser
 * and MFA is completed (AAL2).
 */
export async function requireOperator(): Promise<OperatorAccessResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      status: 401,
      code: "unauthenticated",
      message: "Authentication required.",
    };
  }

  if (!readSuperuserEmail()) {
    return {
      ok: false,
      status: 403,
      code: "superuser_not_configured",
      message:
        "Inventory mint is locked. Set ZELOXTAG_SUPERUSER_EMAIL to a single address.",
    };
  }

  if (!isOperatorEmail(user.email)) {
    return {
      ok: false,
      status: 403,
      code: "not_superuser",
      message: "Superuser only — tag minting denied.",
    };
  }

  const supabase = await createClient();
  const { data: aal, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError) {
    return {
      ok: false,
      status: 403,
      code: "mfa_unavailable",
      message: "MFA status unavailable — operator access denied.",
    };
  }
  if (aal?.currentLevel !== "aal2") {
    return {
      ok: false,
      status: 403,
      code: "mfa_required",
      message:
        "Operator MFA required. Enable 2FA under Settings and complete the challenge.",
    };
  }

  return {
    ok: true,
    email: user.email!,
    userId: user.id,
  };
}
