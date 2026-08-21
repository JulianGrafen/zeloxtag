import { SITE_LEGAL } from "@/lib/legal/site-legal";

/** Canonical production origin for metadata, sitemap, and OG URLs. */
export function getSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_LEGAL_WEBSITE,
    SITE_LEGAL.website,
  ];

  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    try {
      return new URL(trimmed).origin;
    } catch {
      continue;
    }
  }

  return "https://app.zeloxtag.de";
}
