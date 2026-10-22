import Image from "next/image";
import { ExternalLink, Shield } from "lucide-react";

import type { PublicShowcaseB2bPartner } from "@/lib/vehicles/public-showcase-data";
import { cn } from "@/lib/utils";

type ShowcaseBuiltByPartnerProps = {
  partner: PublicShowcaseB2bPartner;
  className?: string;
};

export function ShowcaseBuiltByPartner({
  partner,
  className,
}: ShowcaseBuiltByPartnerProps) {
  const logoSrc = partner.logoSrc?.trim() || null;

  return (
    <section
      className={cn(
        "rounded-2xl border border-neutral-800/90 bg-neutral-900/50 p-4 backdrop-blur-md",
        "shadow-[0_12px_40px_rgba(0,0,0,0.28)]",
        className,
      )}
      aria-label="Offizieller Erbauer"
    >
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {partner.kicker}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-800 bg-black/60"
        >
          {logoSrc ? (
            <Image
              src={logoSrc}
              alt={partner.logoAlt ?? partner.name}
              width={96}
              height={48}
              className="h-full w-full object-contain p-1.5"
              unoptimized
            />
          ) : (
            <Shield className="h-5 w-5 text-neutral-400" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-[family-name:var(--font-display)] text-[1.05rem] font-semibold tracking-tight text-white">
            {partner.name}
          </p>
          <p className="mt-0.5 text-[0.78rem] leading-snug text-neutral-500">
            Verifizierter Partner-Build auf ZeloxTag
          </p>
        </div>
      </div>

      <a
        href={partner.ctaHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "mt-4 inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl",
          "border border-red-500/35 bg-gradient-to-b from-red-600/90 to-red-700/90",
          "text-[0.9rem] font-semibold text-white shadow-[0_0_24px_rgba(239,68,68,0.22)]",
          "transition-[transform,box-shadow] active:scale-[0.99] hover:shadow-[0_0_32px_rgba(239,68,68,0.32)]",
        )}
      >
        {partner.ctaLabel}
        <ExternalLink className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
      </a>
    </section>
  );
}
