import type { Document } from "@/types/database";
import type { PublicShowcaseB2bPartner } from "@/lib/vehicles/public-showcase-data";

export const AUTOHAUS_KEMPER_LOGO_SRC =
  "/demo/autohaus-kemper-unique-projects-logo.png";
export const AUTOHAUS_KEMPER_PARTNER_WEB_URL = "https://uniqueproject.de/";

/** Same „Built by“ branding as the `/demo/autohaus-kemper` partner page. */
export const AUTOHAUS_KEMPER_B2B_PARTNER: PublicShowcaseB2bPartner = {
  kicker: "Built by",
  name: "Autohaus Kemper",
  logoSrc: AUTOHAUS_KEMPER_LOGO_SRC,
  logoAlt: "Unique Projects by Autohaus Kemper",
  logoPresentation: "wordmark",
  ctaLabel: "Projekt anfragen",
  ctaHref: AUTOHAUS_KEMPER_PARTNER_WEB_URL,
};

type KnownWorkshopPartner = {
  matches: (value: string) => boolean;
  partner: PublicShowcaseB2bPartner;
};

const KNOWN_WORKSHOP_PARTNERS: readonly KnownWorkshopPartner[] = [
  {
    matches: (value) =>
      /\bkemper\b/i.test(value) || /\bunique\s+projects?\b/i.test(value),
    partner: AUTOHAUS_KEMPER_B2B_PARTNER,
  },
];

/**
 * Detects a known workshop partner from the vendor of public invoices /
 * Umbauten (scanned or manual) so the showcase gets the partner branding.
 */
export function resolveKnownWorkshopPartner(
  publicDocuments: readonly Pick<Document, "vendor" | "manufacturer">[],
): PublicShowcaseB2bPartner | null {
  for (const doc of publicDocuments) {
    const candidates = [doc.vendor, doc.manufacturer];
    for (const raw of candidates) {
      const value = raw?.trim();
      if (!value) continue;
      const hit = KNOWN_WORKSHOP_PARTNERS.find((entry) => entry.matches(value));
      if (hit) return { ...hit.partner };
    }
  }
  return null;
}
