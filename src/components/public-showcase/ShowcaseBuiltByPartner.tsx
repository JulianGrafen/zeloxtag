import Image from "next/image";
import { BadgeCheck, ExternalLink, Shield, Smartphone } from "lucide-react";

import {
  instagramHandleLabel,
  instagramProfileUrl,
  parseInstagramHandle,
} from "@/lib/vehicles/instagram-handle";
import type { PublicShowcaseB2bPartner } from "@/lib/vehicles/public-showcase-data";
import { cn } from "@/lib/utils";

import { InstagramGlyph } from "./InstagramGlyph";
import { ShowroomGroup } from "./ShowroomGroup";
import { showroom } from "./showroom-styles";

type ShowcaseBuiltByPartnerProps = {
  partner: PublicShowcaseB2bPartner;
  instagramHandle?: string | null;
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
  instagramHandle: instagramHandleRaw,
  className,
}: ShowcaseBuiltByPartnerProps) {
  const logoSrc = partner.logoSrc?.trim() || null;
  const { primary, secondary } = resolveBuiltByCtas(partner);
  const instagramHandle = parseInstagramHandle(instagramHandleRaw);

  return (
    <section className={cn("px-4", className)} aria-label="Offizieller Erbauer">
      <h2 className={cn(showroom.sectionLabel, "flex items-center gap-1.5")}>
        <span>{partner.kicker}</span>
        <BadgeCheck
          className="h-3.5 w-3.5 shrink-0 text-sky-400"
          strokeWidth={2.25}
          aria-hidden
        />
        <span className="sr-only">Verifiziert</span>
      </h2>
      <ShowroomGroup accent>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/55 px-3.5 py-2 ring-1 ring-white/5",
              logoSrc ? "h-10 min-w-[8.75rem] max-w-[11.5rem]" : "h-11 w-11",
            )}
          >
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt={partner.logoAlt ?? partner.name}
                width={184}
                height={48}
                className="h-[1.35rem] w-auto max-w-full object-contain object-center sm:h-6"
                unoptimized
              />
            ) : (
              <Shield className="h-4 w-4 text-white/80" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={showroom.listTitle}>{partner.name}</p>
            {instagramHandle ? (
              <a
                href={instagramProfileUrl(instagramHandle)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex max-w-full min-h-8 items-center gap-1.5 text-[0.82rem] font-medium leading-snug text-white/60 transition-colors hover:text-white/85"
              >
                <InstagramGlyph className="h-[0.9rem] w-[0.9rem] shrink-0 text-white/50" />
                <span className="truncate">
                  {instagramHandleLabel(instagramHandle)}
                </span>
              </a>
            ) : null}
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
