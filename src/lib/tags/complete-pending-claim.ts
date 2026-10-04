import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import { completeClaimForOwner } from "@/lib/tags/complete-claim-for-owner";
import {
  clearPendingClaimState,
  resolvePendingClaim,
} from "@/lib/tags/pending-claim";

const ownerUserIdSchema = z.string().uuid();

/**
 * Completes a deferred tag claim after auth (email confirm / magic link).
 * Internal only — not a Server Action export (prevents IDOR via forged user ids).
 * Does not mint inventory tags.
 */
export async function completePendingClaimForUser(
  ownerUserId: string,
): Promise<
  | { status: "claimed"; tagUuid: string; nextTagUuid: string | null }
  | { status: "error"; message: string }
  | null
> {
  const parsed = ownerUserIdSchema.safeParse(ownerUserId);
  if (!parsed.success) {
    return { status: "error", message: "Ungültige Sitzung." };
  }

  const pending = await resolvePendingClaim(parsed.data);
  if (!pending) return null;

  const user = await getCurrentUser();
  if (
    user &&
    pending.email.trim().toLowerCase() !== user.email?.trim().toLowerCase()
  ) {
    return {
      status: "error",
      message: "Gespeicherte Tag-Daten passen nicht zu diesem Konto.",
    };
  }

  const result = await completeClaimForOwner(parsed.data, pending);
  if (result.status === "claimed") {
    await clearPendingClaimState(parsed.data);
  }
  return result;
}
