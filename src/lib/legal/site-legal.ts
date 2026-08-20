/** Public legal / imprint data — override via NEXT_PUBLIC_LEGAL_* env vars. */

function env(key: string, fallback: string): string {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : fallback;
}

export const SITE_LEGAL = {
  brand: "ZeloxTag",
  companyName: env("NEXT_PUBLIC_LEGAL_COMPANY_NAME", "ZeloxTag"),
  legalForm: env("NEXT_PUBLIC_LEGAL_LEGAL_FORM", ""),
  representative: env("NEXT_PUBLIC_LEGAL_REPRESENTATIVE", ""),
  street: env("NEXT_PUBLIC_LEGAL_STREET", ""),
  postalCode: env("NEXT_PUBLIC_LEGAL_POSTAL_CODE", ""),
  city: env("NEXT_PUBLIC_LEGAL_CITY", ""),
  country: env("NEXT_PUBLIC_LEGAL_COUNTRY", "Deutschland"),
  email: env("NEXT_PUBLIC_LEGAL_EMAIL", "kontakt@zeloxtag.de"),
  phone: env("NEXT_PUBLIC_LEGAL_PHONE", ""),
  vatId: env("NEXT_PUBLIC_LEGAL_VAT_ID", ""),
  registerCourt: env("NEXT_PUBLIC_LEGAL_REGISTER_COURT", ""),
  registerNumber: env("NEXT_PUBLIC_LEGAL_REGISTER_NUMBER", ""),
  contentResponsible: env("NEXT_PUBLIC_LEGAL_CONTENT_RESPONSIBLE", ""),
  website: env("NEXT_PUBLIC_LEGAL_WEBSITE", "https://app.zeloxtag.de"),
} as const;

export function formatLegalAddress(): string | null {
  const parts = [
    SITE_LEGAL.street,
    [SITE_LEGAL.postalCode, SITE_LEGAL.city].filter(Boolean).join(" "),
    SITE_LEGAL.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}
