import { normalizeDocumentDateIso } from "@/lib/documents/format";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse optional document date for server actions.
 * `undefined` = field omitted; `null` = clear; string = ISO date or invalid sentinel.
 */
export function parseDocumentDateField(
  value: unknown,
): string | null | undefined | "invalid" {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return "invalid";
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = normalizeDocumentDateIso(trimmed);
  if (normalized && ISO_DATE_RE.test(normalized)) return normalized;
  if (ISO_DATE_RE.test(trimmed)) return trimmed;
  return "invalid";
}
