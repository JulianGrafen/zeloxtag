import type { PublicShowcaseB2bPartner } from "@/lib/vehicles/public-showcase-data";
import { cn } from "@/lib/utils";

export function isPartnerWordmarkLogo(
  partner: Pick<PublicShowcaseB2bPartner, "logoPresentation">,
): boolean {
  return partner.logoPresentation === "wordmark";
}

export function showcasePartnerLogoFrameClassName(
  partner: Pick<PublicShowcaseB2bPartner, "logoPresentation">,
  variant: "builtBy" | "vendorBadge",
): string {
  const wordmark = isPartnerWordmarkLogo(partner);
  if (variant === "builtBy") {
    return wordmark
      ? "h-11 w-[8.5rem] max-w-[min(68vw,8.5rem)] rounded-full px-2.5 py-1.5"
      : "h-16 w-[calc(4rem*666/375+0.5rem)] max-w-[min(92vw,14rem)] p-1";
  }
  return wordmark
    ? "h-8 w-[5.75rem] max-w-[38vw] rounded-full px-1.5 py-1"
    : "h-11 w-[calc(2.375rem*666/375+0.1rem)] max-w-[4.65rem]";
}

export function showcasePartnerLogoImageClassName(
  partner: Pick<PublicShowcaseB2bPartner, "logoPresentation">,
  variant: "builtBy" | "vendorBadge",
): string {
  const wordmark = isPartnerWordmarkLogo(partner);
  return cn(
    "object-contain object-center",
    wordmark ? "scale-100" : variant === "builtBy" ? "scale-[1.3]" : "scale-[1.48]",
  );
}
