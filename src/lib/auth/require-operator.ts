import { getCurrentUser } from "@/lib/auth/get-user";

/**
 * Comma-separated allowlist of operator emails for inventory minting.
 * Example: ZELOXTAG_OPERATOR_EMAILS=ops@zeloxtag.de,julian@example.com
 */
export function readOperatorEmails(): Set<string> {
  const raw = process.env.ZELOXTAG_OPERATOR_EMAILS?.trim() ?? "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isOperatorEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = readOperatorEmails();
  if (allowlist.size === 0) return false;
  return allowlist.has(email.trim().toLowerCase());
}

/**
 * Inventory / QR mint surfaces — fail closed unless allowlist is configured
 * and the session email matches.
 */
export async function requireOperator(): Promise<
  | { ok: true; email: string; userId: string }
  | { ok: false; status: 401 | 403; message: string }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, status: 401, message: "Authentication required." };
  }

  const allowlist = readOperatorEmails();
  if (allowlist.size === 0) {
    return {
      ok: false,
      status: 403,
      message:
        "Inventory mint is locked. Set ZELOXTAG_OPERATOR_EMAILS on the server.",
    };
  }

  if (!isOperatorEmail(user.email)) {
    return {
      ok: false,
      status: 403,
      message: "Operator allowlist only — tag minting denied.",
    };
  }

  return {
    ok: true,
    email: user.email!,
    userId: user.id,
  };
}
