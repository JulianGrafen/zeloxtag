import { createHash, randomBytes, timingSafeEqual } from "crypto";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

export const MFA_RECOVERY_CODE_COUNT = 8;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function recoveryPepper(): string {
  return (
    process.env.MFA_RECOVERY_PEPPER?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    ""
  );
}

/** Normalize user input: strip separators, uppercase. */
export function normalizeRecoveryCode(raw: string): string {
  return raw.replace(/[\s\-]/g, "").toUpperCase();
}

export function formatRecoveryCode(normalized: string): string {
  const clean = normalizeRecoveryCode(normalized);
  if (clean.length !== 8) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}

export function hashRecoveryCode(normalized: string): string {
  const pepper = recoveryPepper();
  if (!pepper) {
    throw new Error("MFA recovery pepper is not configured.");
  }
  return createHash("sha256")
    .update(`${pepper}:${normalizeRecoveryCode(normalized)}`)
    .digest("hex");
}

function generateOneCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

export function generateRecoveryCodes(
  count = MFA_RECOVERY_CODE_COUNT,
): string[] {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(generateOneCode());
  }
  return [...codes].map(formatRecoveryCode);
}

function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function replaceRecoveryCodesForUser(
  userId: string,
  plaintextCodes: string[],
): Promise<void> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY fehlt für Recovery-Codes.");
  }
  const admin = createAdminClient();
  const rows = plaintextCodes.map((code) => ({
    user_id: userId,
    code_hash: hashRecoveryCode(code),
  }));

  const { error: deleteError } = await admin
    .from("mfa_recovery_codes")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (rows.length === 0) return;

  const { error: insertError } = await admin
    .from("mfa_recovery_codes")
    .insert(rows);

  if (insertError) {
    throw new Error(insertError.message);
  }
}

export async function countUnusedRecoveryCodes(
  userId: string,
): Promise<number> {
  if (!isSupabaseAdminConfigured()) return 0;
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("mfa_recovery_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("used_at", null);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Consume one unused recovery code for the user.
 * Returns false for invalid / already-used codes.
 */
export async function consumeRecoveryCode(
  userId: string,
  codeRaw: string,
): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return false;

  const normalized = normalizeRecoveryCode(codeRaw);
  if (!/^[A-Z2-9]{8}$/.test(normalized)) return false;

  let codeHash: string;
  try {
    codeHash = hashRecoveryCode(normalized);
  } catch {
    return false;
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("mfa_recovery_codes")
    .select("id, code_hash, used_at")
    .eq("user_id", userId)
    .is("used_at", null);

  if (error || !rows?.length) return false;

  const match = rows.find((row) => hashesMatch(row.code_hash, codeHash));
  if (!match || match.used_at) return false;

  const { data: updated, error: updateError } = await admin
    .from("mfa_recovery_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", match.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();

  return Boolean(!updateError && updated);
}

/**
 * Remove all MFA factors for the user.
 * Supabase logs the user out of all sessions when a verified factor is deleted.
 */
export async function adminRemoveTotpFactors(userId: string): Promise<void> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY fehlt.");
  }
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId });
  if (error) {
    throw new Error(error.message);
  }

  const factors = data?.factors ?? [];
  for (const factor of factors) {
    if (!factor?.id) continue;
    const deleted = await admin.auth.admin.mfa.deleteFactor({
      id: factor.id,
      userId,
    });
    if (deleted.error) {
      throw new Error(deleted.error.message);
    }
  }
}
