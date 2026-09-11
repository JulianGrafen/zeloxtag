"use client";

import { useState } from "react";
import { ExternalLink, Expand } from "lucide-react";

import { formatPublicVehicleTitle } from "@/lib/vehicles/format-public-vehicle-title";
import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

import { ShowroomDisclosure } from "./ShowroomDisclosure";
import { ShowroomGalleryLightbox } from "./ShowroomGalleryLightbox";
import { showroom } from "./showroom-styles";

type ShowroomDynoProps = {
  profile: PublicShowcaseProfile;
  embedded?: boolean;
};

export function ShowroomDyno({ profile, embedded = false }: ShowroomDynoProps) {
  const [open, setOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
        <div className="px-4 py-4">
          <a
            href={profile.dynoChartUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={showroom.cta}
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            PDF öffnen
          </a>
        </div>
      )}
    </>
  );

  const disclosure = (
    <ShowroomDisclosure
      title="Leistungsdiagramm"
      open={open}
      onToggle={() => setOpen((value) => !value)}
      panelId="showroom-dyno-panel"
    >
      {panel}
    </ShowroomDisclosure>
  );

  return (
    <>
      {embedded ? disclosure : <div className={showroom.panelFlat}>{disclosure}</div>}

      {lightboxOpen && profile.dynoChartIsImage && profile.dynoChartUrl ? (
        <ShowroomGalleryLightbox
          photos={[
            {
              id: "dyno-chart",
              src: profile.dynoChartUrl,
              alt: dynoAlt,
            },
          ]}
          initialIndex={0}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </>
  );
}
