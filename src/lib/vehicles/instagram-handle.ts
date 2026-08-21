const HANDLE_PATTERN = /^[A-Za-z0-9._]{1,30}$/;
const URL_HANDLE_PATTERN =
  /(?:instagram\.com\/)([A-Za-z0-9._]{1,30})/i;

/** Sanitize a public Instagram handle. Never accept arbitrary URLs. */
export function parseInstagramHandle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fromUrl = URL_HANDLE_PATTERN.exec(trimmed);
  const candidate = (fromUrl?.[1] ?? trimmed.replace(/^@/, "")).trim();
  if (!HANDLE_PATTERN.test(candidate)) return null;
  if (/^dein[_-]?username$/i.test(candidate)) return null;
  return candidate;
}

export function instagramProfileUrl(handle: string): string {
  return `https://www.instagram.com/${handle}/`;
}

export function instagramHandleLabel(handle: string): string {
  return `@${handle}`;
}
