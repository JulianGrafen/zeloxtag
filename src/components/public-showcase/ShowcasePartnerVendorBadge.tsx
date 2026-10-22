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
        "pointer-events-auto relative z-[1] inline-flex max-w-full min-h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-black/55 px-2.5 py-1",
        "transition-colors hover:border-white/25 hover:bg-white/[0.08]",
        className,
      )}
      aria-label={`${partner.name} — Partnerseite öffnen`}
    >
      {logoSrc ? (
        <Image
          src={logoSrc}
          alt={partner.logoAlt ?? partner.name}
          width={140}
          height={36}
          className="h-[1.125rem] w-auto max-w-[8.5rem] object-contain object-left"
          unoptimized
        />
      ) : (
        <ModBadge className="border-0 bg-transparent p-0">{label}</ModBadge>
      )}
      <ExternalLink
        className="h-3.5 w-3.5 shrink-0 text-white/45"
        aria-hidden
      />
    </a>
  );
}
