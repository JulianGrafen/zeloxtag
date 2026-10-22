"use client";

import { useState } from "react";
import { Expand } from "lucide-react";

import { formatPublicVehicleTitle } from "@/lib/vehicles/format-public-vehicle-title";
import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

import { ShowroomDisclosure } from "./ShowroomDisclosure";
import { ShowroomDynoPdfPreview } from "./ShowroomDynoPdfPreview";
import { ShowroomGalleryLightbox } from "./ShowroomGalleryLightbox";
import { showroom } from "./showroom-styles";

type ShowroomDynoProps = {
  profile: PublicShowcaseProfile;
  embedded?: boolean;
};

function dynoCollapsedSubtitle(): string {
  return "Diagramm anzeigen";
}

export function ShowroomDyno({ profile, embedded = false }: ShowroomDynoProps) {
  const [open, setOpen] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (!profile.dynoChartUrl) return null;

  const dynoAlt = `Leistungsdiagramm ${formatPublicVehicleTitle(
    profile.make,
    profile.model,
  )}`.trim();

  const panel = (
    <>
      {profile.dynoChartIsImage ? (
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="group relative block w-full"
          aria-label={`${dynoAlt} vergrößern`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.dynoChartUrl}
            alt={dynoAlt}
            className="aspect-[4/3] w-full bg-black object-contain"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white/90 backdrop-blur-sm"
          >
            <Expand className="h-3.5 w-3.5" />
          </span>
        </button>
      ) : (
        <ShowroomDynoPdfPreview
          url={profile.dynoChartUrl}
          alt={dynoAlt}
          onExpand={(previewSrc) => {
            setLightboxSrc(previewSrc);
            setLightboxOpen(true);
          }}
        />
      )}
    </>
  );

  const disclosure = (
    <ShowroomDisclosure
      title="Leistungsdiagramm"
      subtitle={open ? undefined : dynoCollapsedSubtitle()}
      open={open}
      onToggle={() => setOpen((value) => !value)}
      panelId="showroom-dyno-panel"
      collapsible
    >
      {panel}
    </ShowroomDisclosure>
  );

  return (
    <>
      {embedded ? disclosure : <div className={showroom.panelFlat}>{disclosure}</div>}

      {lightboxOpen && profile.dynoChartUrl ? (
        <ShowroomGalleryLightbox
          photos={[
            {
              id: "dyno-chart",
              src: lightboxSrc ?? profile.dynoChartUrl,
              alt: dynoAlt,
            },
          ]}
          initialIndex={0}
          onClose={() => {
            setLightboxOpen(false);
            setLightboxSrc(null);
          }}
        />
      ) : null}
    </>
  );
}
