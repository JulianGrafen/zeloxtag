import type { DocumentLineItem } from "@/types/database";

/**
 * Parse line_items from FormData / JSONB / unknown RPC payloads.
 */
export function parseLineItems(raw: unknown): DocumentLineItem[] | null {
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

  const items: DocumentLineItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const label =
      typeof record.label === "string" ? record.label.trim().slice(0, 160) : "";
    const amount =
      typeof record.amount === "number"
        ? record.amount
        : typeof record.amount === "string"
          ? Number.parseFloat(record.amount.replace(",", "."))
          : NaN;
    if (!label || !Number.isFinite(amount)) continue;
    items.push({
      label,
      amount: Math.round(amount * 100) / 100,
    });
    if (items.length >= 40) break;
  }

  return items.length > 0 ? items : null;
}

export function sumLineItems(items: DocumentLineItem[] | null): number | null {
  if (!items?.length) return null;
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return Math.round(total * 100) / 100;
}
