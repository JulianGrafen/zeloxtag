"use client";

import { useState } from "react";
import { ExternalLink, Expand, Gauge } from "lucide-react";

import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

import { ShowroomGalleryLightbox } from "./ShowroomGalleryLightbox";
import { showroom } from "./showroom-styles";

type ShowroomDynoProps = {
  profile: PublicShowcaseProfile;
};

export function ShowroomDyno({ profile }: ShowroomDynoProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!profile.dynoChartUrl) return null;

  const dynoAlt =
    `Leistungsdiagramm ${profile.make} ${profile.model}`.trim();

  return (
    <>
      <section className="px-4">
        <div className={showroom.panel}>
          <p
            className={`border-b border-white/15 px-4 py-2.5 ${showroom.sectionTitle}`}
          >
            Leistungsdiagramm
          </p>

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
            <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-white/70">
                <Gauge className="h-5 w-5" aria-hidden />
              </div>
              <p className={showroom.body}>
                Dyno- bzw. Leistungsdiagramm als PDF hinterlegt.
              </p>
              <a
                href={profile.dynoChartUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={showroom.cta}
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Diagramm öffnen
              </a>
            </div>
          )}
        </div>
      </section>

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
