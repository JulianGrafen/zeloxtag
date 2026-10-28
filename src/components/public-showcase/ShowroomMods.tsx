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

import { formatDocumentDate } from "@/lib/documents/format";
import { cn } from "@/lib/utils";

import { ModBadge } from "./ModBadge";
import { ShowcasePartnerVendorBadge } from "./ShowcasePartnerVendorBadge";
import { ShowroomDisclosure } from "./ShowroomDisclosure";
import { showroomModLabelTypography } from "./showroom-mod-typography";
import { showroom } from "./showroom-styles";

type ShowroomModsProps = {
  modifications: PublicModification[];
  partnerBranding?: PublicShowcaseB2bPartner | null;
  embedded?: boolean;
  /** Demo / partner pitch — Umbauten list open on first paint. */
  defaultOpen?: boolean;
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const label = formatDocumentDate(iso);
  return label === "Ohne Datum" ? null : label;
}

function umbautenSubtitle(
  modifications: PublicModification[],
  open: boolean,
): string | undefined {
  if (open || modifications.length === 0) return undefined;
  const count = modifications.length;
  return count === 1 ? "1 Umbau" : `${count} Umbauten`;
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

export function ShowroomMods({
  modifications,
  partnerBranding = null,
  embedded = false,
  defaultOpen = false,
}: ShowroomModsProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (modifications.length === 0) {
    return null;
  }

  const list = (
    <UmbautenList
      modifications={modifications}
      partnerBranding={partnerBranding}
    />
  );

  const subtitle = umbautenSubtitle(modifications, open);

  const disclosure = (
    <ShowroomDisclosure
      title="Umbauten"
      subtitle={subtitle}
      open={open}
      onToggle={() => setOpen((value) => !value)}
      panelId="showroom-mods-list"
      collapsible
    >
      {list}
    </ShowroomDisclosure>
  );

  if (embedded) {
    return disclosure;
  }

  return <div className={showroom.panelFlat}>{disclosure}</div>;
}
