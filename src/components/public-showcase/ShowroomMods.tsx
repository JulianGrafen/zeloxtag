"use client";

import { useState } from "react";

import type {
  PublicModification,
  PublicShowcaseB2bPartner,
} from "@/lib/vehicles/public-showcase-data";
import {
  modMatchesPartnerBrand,
  partnerBrandHref,
} from "@/lib/showcase/partner-mod-branding";
import { useRegionalFormatters } from "@/lib/i18n/hooks/use-regional-formatters";

import { formatDocumentDate } from "@/lib/documents/format";
import { cn } from "@/lib/utils";

import { ModBadge } from "./ModBadge";
import { ShowcasePartnerVendorBadge } from "./ShowcasePartnerVendorBadge";
import { ShowroomDisclosure } from "./ShowroomDisclosure";
import { ShowroomGroup } from "./ShowroomGroup";
import { showroomModLabelTypography } from "./showroom-mod-typography";
import { showroom } from "./showroom-styles";

/** True when at least one umbau has a showcase photo — then we show the carousel, not the text list. */
export function modificationsHaveShowcaseImages(
  modifications: readonly Pick<PublicModification, "imageSrc">[],
): boolean {
  return modifications.some((mod) => Boolean(mod.imageSrc?.trim()));
}

type ShowroomModsProps = {
  modifications: PublicModification[];
  partnerBranding?: PublicShowcaseB2bPartner | null;
  embedded?: boolean;
};

/** Compact month/year badge on carousel cards (e.g. `03/26`). */
export function formatShowroomModBadgeDate(iso: string | null): string | null {
  if (!iso?.trim()) return null;
  const normalized = iso.trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})/.exec(normalized);
  if (!match) return null;
  return `${match[2]}/${match[1].slice(2)}`;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const label = formatDocumentDate(iso);
  return label === "Ohne Datum" ? null : label;
}

function UmbautenList({
  modifications,
  partnerBranding,
}: {
  modifications: PublicModification[];
  partnerBranding?: PublicShowcaseB2bPartner | null;
}) {
  return (
    <ul id="showroom-mods-list" className="min-w-0 max-w-full overflow-x-hidden">
      {modifications.map((mod, index) => {
        const dateLabel = formatDate(mod.date);
        const isLastMod = index === modifications.length - 1;
        const labelType = showroomModLabelTypography(mod.label);
        const isPartnerMod = modMatchesPartnerBrand(mod, partnerBranding);
        const partnerHref = isPartnerMod
          ? partnerBrandHref(partnerBranding)
          : null;
        const titleClassName = cn(
          labelType.className,
          "max-w-full break-words [overflow-wrap:anywhere] text-pretty",
          partnerHref &&
            "pointer-events-auto underline decoration-white/20 underline-offset-2 transition-colors hover:text-white hover:decoration-white/45",
        );
        return (
          <li
            key={mod.id}
            className={cn(
              "min-w-0 px-4 py-3.5",
              !isLastMod && "border-b border-white/10",
            )}
          >
            {partnerHref ? (
              <a
                href={partnerHref}
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto relative z-[1] block min-w-0"
              >
                <p className={titleClassName} style={labelType.style}>
                  {mod.label}
                </p>
              </a>
            ) : (
              <p className={titleClassName} style={labelType.style}>
                {mod.label}
              </p>
            )}
            {dateLabel || mod.vendor || isPartnerMod ? (
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
                {dateLabel ? (
                  <p className="text-[0.76rem] tabular-nums text-white/42">
                    {dateLabel}
                  </p>
                ) : null}
                {isPartnerMod && partnerBranding ? (
                  <ShowcasePartnerVendorBadge
                    partner={partnerBranding}
                    vendorLabel={mod.vendor}
                    className="max-w-full shrink"
                  />
                ) : mod.vendor ? (
                  <ModBadge className="max-w-full shrink">{mod.vendor}</ModBadge>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function ShowroomModCarouselCard({
  mod,
  partnerBranding,
  priceLabel,
}: {
  mod: PublicModification;
  partnerBranding?: PublicShowcaseB2bPartner | null;
  priceLabel: string | null;
}) {
  const badgeDate = formatShowroomModBadgeDate(mod.date);
  const labelType = showroomModLabelTypography(mod.label);
  const isPartnerMod = modMatchesPartnerBrand(mod, partnerBranding);
  const partnerHref = isPartnerMod ? partnerBrandHref(partnerBranding) : null;

  const cardInner = (
    <>
      {mod.imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mod.imageSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-950"
          aria-hidden
        />
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/55 via-45% to-black/10"
        aria-hidden
      />
      {badgeDate ? (
        <span className="absolute left-2.5 top-2.5 z-[1] rounded-md bg-black/55 px-2 py-0.5 text-[0.68rem] font-semibold tabular-nums tracking-wide text-white backdrop-blur-sm">
          {badgeDate}
        </span>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 z-[1] p-3 pt-8">
        <p
          className={cn(
            labelType.className,
            "line-clamp-2 text-[0.95rem] font-semibold leading-snug text-white drop-shadow-sm",
          )}
          style={labelType.style}
        >
          {mod.label}
        </p>
        {priceLabel ? (
          <p className="mt-1 text-[0.82rem] font-medium tabular-nums text-white/85">
            {priceLabel}
          </p>
        ) : null}
      </div>
    </>
  );

  const className =
    "relative aspect-[3/4] w-[9.25rem] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 sm:w-[9.75rem]";

  if (partnerHref) {
    return (
      <a
        href={partnerHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(className, "block")}
      >
        {cardInner}
      </a>
    );
  }

  return <article className={className}>{cardInner}</article>;
}

export function ShowroomMods({
  modifications,
  partnerBranding = null,
  embedded = false,
}: ShowroomModsProps) {
  const { formatMoney } = useRegionalFormatters();
  const hasGalleryImages = modificationsHaveShowcaseImages(modifications);
  const carouselMods = hasGalleryImages
    ? modifications.filter((mod) => Boolean(mod.imageSrc?.trim()))
    : modifications;
  const [listOpen, setListOpen] = useState(false);

  if (modifications.length === 0) {
    return null;
  }

  const count = modifications.length;
  const countSubtitle =
    count === 1 ? "1 Eintrag" : `${count} Einträge`;

  const carousel = (
    <div
      className="-mx-4 flex gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1 snap-x snap-mandatory no-scrollbar"
      aria-label="Umbauten"
    >
      {carouselMods.map((mod) => (
        <ShowroomModCarouselCard
          key={mod.id}
          mod={mod}
          partnerBranding={partnerBranding}
          priceLabel={formatMoney(mod.amount)}
        />
      ))}
    </div>
  );

  const listDisclosure = (
    <ShowroomGroup>
      <ShowroomDisclosure
        title="Umbauten"
        subtitle={countSubtitle}
        open={listOpen}
        onToggle={() => setListOpen((open) => !open)}
        panelId="showroom-mods-disclosure"
      >
        <UmbautenList
          modifications={modifications}
          partnerBranding={partnerBranding}
        />
      </ShowroomDisclosure>
    </ShowroomGroup>
  );

  const section = hasGalleryImages ? (
    <section className="min-w-0">
      <div className="mb-3 px-1">
        <h2 className={showroom.sectionTitle}>Umbauten</h2>
      </div>
      {carousel}
    </section>
  ) : (
    <section className="min-w-0">{listDisclosure}</section>
  );

  if (embedded) {
    return section;
  }

  return <div className={showroom.panelFlat}>{section}</div>;
}
