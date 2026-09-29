import type { Json } from "@/types/database";

export type HardwareRpcResult =
  | { ok: true; vehicleId?: string; tagUuid?: string }
  | { ok: false; error: string };

export function parseHardwareRpcResult(data: Json | null): HardwareRpcResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "unavailable" };
  }
  const record = data as Record<string, unknown>;
  if (record.ok !== true) {
    const error =
      typeof record.error === "string" ? record.error : "unavailable";
    return { ok: false, error };
  }
  const vehicleId =
    typeof record.vehicle_id === "string" ? record.vehicle_id : undefined;
  const tagUuid =
    typeof record.tag_uuid === "string" ? record.tag_uuid : undefined;
  return { ok: true, vehicleId, tagUuid };
}
