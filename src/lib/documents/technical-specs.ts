import type { DocumentTechnicalSpec } from "@/types/database";

export const TECHNICAL_SPEC_MAX_ITEMS = 40;
export const TECHNICAL_SPEC_LABEL_MAX = 80;
export const TECHNICAL_SPEC_VALUE_MAX = 160;

/**
 * Parse technical_specs from FormData / JSONB / unknown RPC payloads.
 */
export function parseTechnicalSpecs(
  raw: unknown,
): DocumentTechnicalSpec[] | null {
  if (raw == null || raw === "") return null;

  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(value)) return null;

  const items: DocumentTechnicalSpec[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const label =
      typeof record.label === "string"
        ? record.label.trim().slice(0, TECHNICAL_SPEC_LABEL_MAX)
        : "";
    const specValue =
      typeof record.value === "string"
        ? record.value.trim().slice(0, TECHNICAL_SPEC_VALUE_MAX)
        : typeof record.value === "number" && Number.isFinite(record.value)
          ? String(record.value)
          : "";
    if (!label || !specValue) continue;
    items.push({ label, value: specValue });
    if (items.length >= TECHNICAL_SPEC_MAX_ITEMS) break;
  }

  return items.length > 0 ? items : null;
}
