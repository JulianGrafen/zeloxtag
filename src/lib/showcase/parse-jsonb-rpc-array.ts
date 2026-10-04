/**
 * Supabase RPCs that return `jsonb` arrays sometimes arrive as a parsed array,
 * sometimes as a JSON string — normalize before mapping rows.
 */
export function parseJsonbRpcArray(data: unknown): unknown[] {
  if (data == null) return [];

  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed) return [];
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return Array.isArray(data) ? data : [];
}
