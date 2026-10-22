import Image from "next/image";
import { ExternalLink, Shield, Smartphone } from "lucide-react";

import type { PublicShowcaseB2bPartner } from "@/lib/vehicles/public-showcase-data";
import { cn } from "@/lib/utils";

import { ShowroomGroup } from "./ShowroomGroup";
import { showroom } from "./showroom-styles";

type ShowcaseBuiltByPartnerProps = {
  partner: PublicShowcaseB2bPartner;
  className?: string;
};

function resolveBuiltByCtas(partner: PublicShowcaseB2bPartner): {
  primary: { label: string; href: string; app: boolean };
  secondary: { label: string; href: string } | null;
} {
  const hasAppCta =
    Boolean(partner.appOpenLabel?.trim()) &&
    Boolean(partner.appOpenHref?.trim());

  if (hasAppCta) {
    return {
      primary: {
        label: partner.appOpenLabel!.trim(),
        href: partner.appOpenHref!.trim(),
        app: true,
      },
      secondary: {
        label: partner.ctaLabel,
        href: partner.ctaHref,
      },
    };
  }

  return {
    primary: {
      label: partner.ctaLabel,
      href: partner.ctaHref,
      app: false,
    },
    secondary: null,
  };
}

export function ShowcaseBuiltByPartner({
  partner,
  className,
}: ShowcaseBuiltByPartnerProps) {
  const logoSrc = partner.logoSrc?.trim() || null;
  const { primary, secondary } = resolveBuiltByCtas(partner);

  return (
    <section className={cn("px-4", className)} aria-label="Offizieller Erbauer">
      <h2 className={showroom.sectionLabel}>{partner.kicker}</h2>
      <ShowroomGroup accent>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div
            className={cn(
              showroom.listLeadingIcon,
              "h-11 w-11 overflow-hidden rounded-xl bg-black/40",
            )}
          >
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt={partner.logoAlt ?? partner.name}
                width={88}
                height={44}
                className="h-full w-full object-contain p-1"
                unoptimized
              />
            ) : (
              <Shield className="h-4 w-4" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={showroom.listTitle}>{partner.name}</p>
            <p className={showroom.listSubtitle}>
              ZeloxTag verbindet Schlossträger und Partner-App
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 px-4 py-3.5">
          <a
            href={primary.href}
            target="_blank"
            rel="noopener noreferrer"
            className={showroom.cta}
          >
            {primary.app ? (
              <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {primary.label}
          </a>
          {secondary ? (
            <a
              href={secondary.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                showroom.pill,
                "min-h-11 w-full justify-center border-white/15 bg-transparent",
              )}
            >
              {secondary.label}
              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            </a>
          ) : null}
        </div>
      </ShowroomGroup>
    </section>
  );
}
