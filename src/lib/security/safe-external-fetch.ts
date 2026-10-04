import { lookup } from "dns/promises";
import { isIP } from "net";

const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 12_000;

function isPrivateIp(address: string): boolean {
  if (!isIP(address)) return true;
  if (address === "127.0.0.1" || address === "::1") return true;
  if (address.startsWith("10.")) return true;
  if (address.startsWith("192.168.")) return true;
  if (address.startsWith("169.254.")) return true;
  if (address.startsWith("fc") || address.startsWith("fd")) return true;
  const parts = address.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }
  return false;
}

async function resolveHostIsPublic(hostname: string): Promise<boolean> {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local")) return false;
  if (isIP(hostname)) {
    return !isPrivateIp(hostname);
  }
  const records = await lookup(hostname, { all: true });
  if (!records.length) return false;
  return records.every((record) => !isPrivateIp(record.address));
}

export type SafeExternalFetchResult =
  | { ok: true; text: string; finalUrl: string }
  | { ok: false; error: string; code: "blocked" | "fetch_failed" };

/**
 * Fetch public HTTP(S) pages for LLM context — blocks private networks (SSRF).
 */
export async function safeExternalFetch(
  rawUrl: string,
): Promise<SafeExternalFetchResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: "Ungültige URL.", code: "blocked" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Nur HTTP(S)-Links erlaubt.", code: "blocked" };
  }

  try {
    const publicHost = await resolveHostIsPublic(parsed.hostname);
    if (!publicHost) {
      return {
        ok: false,
        error: "Diese URL kann nicht abgerufen werden.",
        code: "blocked",
      };
    }
  } catch {
    return {
      ok: false,
      error: "Host konnte nicht aufgelöst werden.",
      code: "blocked",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "ZeloxTag-BuildPlanner/1.0",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Seite antwortet mit Status ${response.status}.`,
        code: "fetch_failed",
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const slice = buffer.subarray(0, MAX_BYTES);
    const text = slice.toString("utf8");

    return {
      ok: true,
      text,
      finalUrl: response.url || parsed.toString(),
    };
  } catch {
    return {
      ok: false,
      error: "Link konnte nicht geladen werden.",
      code: "fetch_failed",
    };
  } finally {
    clearTimeout(timer);
  }
}
