import type { PublicShowcaseB2bPartner } from "@/lib/vehicles/public-showcase-data";
import type { PublicModification } from "@/lib/vehicles/public-showcase-data";

function partnerHref(
  partner: PublicShowcaseB2bPartner | null | undefined,
): string | null {
  const href = partner?.ctaHref?.trim();
  return href ? href : null;
}

/** Mod row tied to the showcase partner (vendor or title). */
export function modMatchesPartnerBrand(
  mod: PublicModification,
  partner: PublicShowcaseB2bPartner | null | undefined,
): boolean {
  if (!partnerHref(partner)) return false;
  const vendor = mod.vendor?.toLowerCase() ?? "";
  const label = mod.label.toLowerCase();
  const partnerToken = partner!.name.toLowerCase().split(/\s+/)[0] ?? "";
  if (vendor.includes("aulitzky") || label.includes("aulitzky")) {
    return true;
  }
  if (vendor.includes("rw edition") || label.includes("rw edition")) {
    return true;
  }
  if (partnerToken.length >= 3 && vendor.includes(partnerToken)) {
    return true;
  }
  return false;
}

/** @deprecated Use {@link modMatchesPartnerBrand}. */
export function modUsesPartnerVendorBadge(
  mod: PublicModification,
  partner: PublicShowcaseB2bPartner | null | undefined,
): boolean {
  return modMatchesPartnerBrand(mod, partner);
}

export function partnerBrandHref(
  partner: PublicShowcaseB2bPartner | null | undefined,
): string | null {
  return partnerHref(partner);
}
