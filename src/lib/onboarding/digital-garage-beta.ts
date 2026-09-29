import "server-only";

/**
 * Beta slot cap for the digital garage only (`create_garage_vehicle`).
 * Tag QR claim flows never call this RPC and are not limited here.
 */

import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type DigitalGarageBetaStatus =
  | { limited: false }
  | {
      limited: true;
      maxSlots: number;
      usedSlots: number;
      remaining: number;
      full: boolean;
      enrolled: boolean;
    };

export const DIGITAL_GARAGE_BETA_FULL_MESSAGE =
  "Die Beta ist voll — alle 15 Plätze sind vergeben. Schreib uns kurz, wenn du auf die Warteliste sollst.";

function parseBetaStatus(data: unknown): DigitalGarageBetaStatus {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { limited: false };
  }
  const row = data as Record<string, unknown>;
  if (row.limited !== true) {
    return { limited: false };
  }

  const maxSlots =
    typeof row.max_slots === "number" ? row.max_slots : Number(row.max_slots);
  const usedSlots =
    typeof row.used_slots === "number" ? row.used_slots : Number(row.used_slots);
  const remaining =
    typeof row.remaining === "number" ? row.remaining : Number(row.remaining);

  if (!Number.isFinite(maxSlots) || maxSlots < 0) {
    return { limited: false };
  }

  return {
    limited: true,
    maxSlots,
    usedSlots: Number.isFinite(usedSlots) ? usedSlots : 0,
    remaining: Number.isFinite(remaining) ? remaining : 0,
    full: row.full === true,
    enrolled: row.enrolled === true,
  };
}

/** Server-side beta cap for `/register` and garage onboarding. */
export async function getDigitalGarageBetaStatus(): Promise<DigitalGarageBetaStatus> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return { limited: false };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("digital_garage_beta_status");
    if (error) {
      console.error("[digital-garage-beta] status rpc failed", error);
      return { limited: false };
    }
    return parseBetaStatus(data);
  } catch (error) {
    console.error("[digital-garage-beta] status unexpected", error);
    return { limited: false };
  }
}

export function isDigitalGarageBetaClosed(
  status: DigitalGarageBetaStatus,
): boolean {
  return status.limited && status.full && !status.enrolled;
}

export function mapGarageRpcError(errorCode: string): string | null {
  if (errorCode === "beta_full") {
    return DIGITAL_GARAGE_BETA_FULL_MESSAGE;
  }
  return null;
}
