import { z } from "zod";

import { completeClaimForOwner } from "@/lib/tags/complete-claim-for-owner";
import {
  clearPendingClaim,
  getPendingClaim,
} from "@/lib/tags/pending-claim";

const ownerUserIdSchema = z.string().uuid();

/**
 * Completes a deferred tag claim after auth (email confirm / magic link).
 * Internal only — not a Server Action export (prevents IDOR via forged user ids).
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

  const pending = await getPendingClaim();
  if (!pending) return null;

  const result = await completeClaimForOwner(parsed.data, pending);
  await clearPendingClaim();
  return result;
}
