/** Public legal / imprint data — override via NEXT_PUBLIC_LEGAL_* env vars. */

function env(key: string, fallback: string): string {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : fallback;
}

export const SITE_LEGAL = {
  brand: "ZeloxTag",
  operatorName: env("NEXT_PUBLIC_LEGAL_OPERATOR_NAME", "Julian Gräfen"),
  companyName: env("NEXT_PUBLIC_LEGAL_COMPANY_NAME", "Julian Gräfen"),
  legalForm: env("NEXT_PUBLIC_LEGAL_LEGAL_FORM", ""),
  representative: env("NEXT_PUBLIC_LEGAL_REPRESENTATIVE", "Julian Gräfen"),
  street: env("NEXT_PUBLIC_LEGAL_STREET", "Pfarrer-Reinartz Str. 11"),
  postalCode: env("NEXT_PUBLIC_LEGAL_POSTAL_CODE", "53925"),
  city: env("NEXT_PUBLIC_LEGAL_CITY", "Kall"),
  country: env("NEXT_PUBLIC_LEGAL_COUNTRY", "Deutschland"),
  email: env("NEXT_PUBLIC_LEGAL_EMAIL", "kontakt@zeloxtag.de"),
  phone: env("NEXT_PUBLIC_LEGAL_PHONE", ""),
  vatId: env("NEXT_PUBLIC_LEGAL_VAT_ID", ""),
  registerCourt: env("NEXT_PUBLIC_LEGAL_REGISTER_COURT", ""),
  registerNumber: env("NEXT_PUBLIC_LEGAL_REGISTER_NUMBER", ""),
  contentResponsible: env(
    "NEXT_PUBLIC_LEGAL_CONTENT_RESPONSIBLE",
    "Julian Gräfen",
  ),
  website: env("NEXT_PUBLIC_LEGAL_WEBSITE", "https://app.zeloxtag.de"),
  appHost: env("NEXT_PUBLIC_LEGAL_APP_HOST", "app.zeloxtag.de"),
} as const;

export function formatLegalAddress(): string {
  return [
    SITE_LEGAL.street,
    `${SITE_LEGAL.postalCode} ${SITE_LEGAL.city}`,
    SITE_LEGAL.country,
  ]
    .filter(Boolean)
    .join(", ");
}

/** Single-line provider block for AGB / Widerruf. */
export function formatLegalProviderInline(): string {
  return `${SITE_LEGAL.operatorName}, ${SITE_LEGAL.street}, ${SITE_LEGAL.postalCode} ${SITE_LEGAL.city}`;
}

export function legalMailtoHref(): string {
  return `mailto:${SITE_LEGAL.email}`;
}
