import Image from "next/image";
import { ExternalLink } from "lucide-react";

import type { PublicShowcaseB2bPartner } from "@/lib/vehicles/public-showcase-data";
import { partnerBrandHref } from "@/lib/showcase/partner-mod-branding";
import { cn } from "@/lib/utils";

import { ModBadge } from "./ModBadge";

type ShowcasePartnerVendorBadgeProps = {
  partner: PublicShowcaseB2bPartner;
  /** Fallback when no logo — linked text pill. */
  vendorLabel?: string | null;
  className?: string;
};

export function ShowcasePartnerVendorBadge({
  partner,
  vendorLabel = null,
  className,
}: ShowcasePartnerVendorBadgeProps) {
  const href = partnerBrandHref(partner);
  if (!href) return null;

  const logoSrc = partner.logoSrc?.trim() || null;
  const label = vendorLabel?.trim() || partner.name;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "pointer-events-auto relative z-[1] inline-flex max-w-full items-center gap-1 rounded-full border border-white/15 bg-black/55 py-0 pl-0.5 pr-1.5",
        "transition-colors hover:border-white/25 hover:bg-white/[0.08]",
        className,
      )}
      aria-label={`${partner.name} — Partnerseite öffnen`}
    >
      {logoSrc ? (
        <span className="relative block h-11 w-[calc(2.375rem*666/375+0.1rem)] max-w-[4.65rem] shrink-0 overflow-hidden rounded-full">
          <Image
            src={logoSrc}
            alt={partner.logoAlt ?? partner.name}
            fill
            sizes="120px"
            className="object-contain object-center scale-[1.48]"
            unoptimized
          />
        </span>
      ) : (
        <ModBadge className="border-0 bg-transparent px-1.5 py-0.5">{label}</ModBadge>
      )}
      <ExternalLink
        className="h-3.5 w-3.5 shrink-0 text-white/45"
        aria-hidden
      />
    </a>
  );
}
