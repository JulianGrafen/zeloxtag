"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Expand } from "lucide-react";

import {
  instagramHandleLabel,
  instagramProfileUrl,
} from "@/lib/vehicles/instagram-handle";
import type {
  PublicGalleryPhoto,
  PublicShowcaseProfile,
} from "@/lib/vehicles/public-showcase-data";

import { filterVisibleGalleryPhotos } from "./PublicGallery";
import { ShowroomGalleryLightbox } from "./ShowroomGalleryLightbox";
import { InstagramGlyph } from "./InstagramGlyph";
import { showroom } from "./showroom-styles";

type ShowroomHeroProps = {
  profile: PublicShowcaseProfile;
  photos: PublicGalleryPhoto[];
};

export function ShowroomHero({ profile, photos }: ShowroomHeroProps) {
  const title = [profile.make, profile.model].filter(Boolean).join(" ");
  const yearLabel = profile.year ? String(profile.year) : null;
  const visiblePhotos = useMemo(
    () => filterVisibleGalleryPhotos(photos),
    [photos],
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const heroGalleryIndex = profile.heroImageSrc
    ? visiblePhotos.findIndex((photo) => photo.src === profile.heroImageSrc)
    : -1;

  function openHeroInGallery() {
    if (visiblePhotos.length === 0 || !profile.heroImageSrc) return;
    setLightboxIndex(heroGalleryIndex >= 0 ? heroGalleryIndex : 0);
  }

  return (
    <>
      <header className="relative z-0 isolate min-h-[78dvh] overflow-hidden">
        <div className="absolute inset-0 bg-black" aria-hidden>
          {profile.heroImageSrc ? (
            <button
              type="button"
              onClick={openHeroInGallery}
              disabled={visiblePhotos.length === 0}
              className="relative block h-full w-full disabled:cursor-default"
              aria-label={`${title || "Fahrzeugfoto"} in Galerie öffnen`}
            >
              <Image
                src={profile.heroImageSrc}
                alt=""
                fill
                priority
                unoptimized
                className="object-cover object-center"
                sizes="100vw"
              />
              {visiblePhotos.length > 0 ? (
                <span
                  aria-hidden
                  className="absolute bottom-28 right-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white/90 backdrop-blur-sm"
                >
                  <Expand className="h-4 w-4" />
                </span>
              ) : null}
            </button>
          ) : null}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-black via-black/70 to-transparent"
            aria-hidden
          />
        </div>

        <div className="pointer-events-none relative z-10 flex min-h-[78dvh] flex-col justify-end px-5 pb-8 pt-[max(4.5rem,env(safe-area-inset-top))]">
          <p className={showroom.kicker}>{profile.make || "ZeloxTag"}</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[2.05rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[2.45rem]">
            {title || "Fahrzeug"}
          </h1>
          {yearLabel ? (
            <p className="mt-2 text-[0.95rem] font-medium text-white/65">
              Baujahr {yearLabel}
            </p>
          ) : null}

          {profile.instagramHandle ? (
            <a
              href={instagramProfileUrl(profile.instagramHandle)}
              target="_blank"
              rel="noopener noreferrer"
              className={`pointer-events-auto mt-5 ${showroom.pill}`}
            >
              <InstagramGlyph className="h-4 w-4 text-white" />
              {instagramHandleLabel(profile.instagramHandle)}
            </a>
          ) : null}
        </div>
      </header>

      {lightboxIndex !== null ? (
        <ShowroomGalleryLightbox
          photos={visiblePhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  );
}
