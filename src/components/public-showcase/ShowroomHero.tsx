"use client";

import { useMemo, useRef, useState } from "react";
import { useReducedMotion, useScroll } from "framer-motion";

import {
  instagramHandleLabel,
  instagramProfileUrl,
} from "@/lib/vehicles/instagram-handle";
import type {
  PublicGalleryPhoto,
  PublicShowcaseProfile,
} from "@/lib/vehicles/public-showcase-data";
import { resolveShowroomHeroKind } from "@/lib/vehicles/showroom-hero-kind";

import { filterVisibleGalleryPhotos } from "./PublicGallery";
import { ShowroomGalleryLightbox } from "./ShowroomGalleryLightbox";
import { InstagramGlyph } from "./InstagramGlyph";
import { ShowroomSpatialScene } from "./ShowroomSpatialScene";
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
  const reduceMotion = useReducedMotion();
  const scrollTrackRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: scrollTrackRef,
    offset: ["start start", "end start"],
  });

  const heroGalleryIndex = profile.heroImageSrc
    ? visiblePhotos.findIndex((photo) => photo.src === profile.heroImageSrc)
    : -1;

  function openHeroInGallery() {
    if (visiblePhotos.length === 0 || !profile.heroImageSrc) return;
    setLightboxIndex(heroGalleryIndex >= 0 ? heroGalleryIndex : 0);
  }

  const heroSrc = profile.heroImageSrc ?? "";
  const heroKind = resolveShowroomHeroKind(heroSrc);
  const parallaxEnabled = Boolean(heroSrc) && !reduceMotion;
  const heroImageClass =
    heroKind === "dyno"
      ? "object-contain object-center px-2"
      : "object-contain object-center";

  const scrollTrackClass =
    parallaxEnabled && heroKind !== "dyno"
      ? showroom.heroSpatialTrack
      : showroom.heroMinHeight;

  const textLayerClass = `pointer-events-none relative z-10 flex ${showroom.heroMinHeight} flex-col justify-end px-5 pb-10 pt-[max(4.5rem,env(safe-area-inset-top))]`;

  return (
    <>
      <header
        ref={scrollTrackRef}
        className={`relative z-0 isolate ${scrollTrackClass}`}
      >
        <div
          className={`sticky top-0 z-0 ${showroom.heroMinHeight} overflow-hidden`}
        >
          {profile.heroImageSrc ? (
            <ShowroomSpatialScene
              heroImageSrc={profile.heroImageSrc}
              heroKind={heroKind}
              heroImageClass={heroImageClass}
              spatialLayerUrls={profile.spatialLayerUrls}
              parallaxEnabled={parallaxEnabled}
              scrollYProgress={scrollYProgress}
              visiblePhotosCount={visiblePhotos.length}
              title={title}
              onOpenGallery={openHeroInGallery}
            />
          ) : (
            <div className="absolute inset-0 bg-black" aria-hidden />
          )}

          <div className={textLayerClass}>
            <HeroCopy profile={profile} title={title} yearLabel={yearLabel} />
          </div>
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

function HeroCopy({
  profile,
  title,
  yearLabel,
}: {
  profile: PublicShowcaseProfile;
  title: string;
  yearLabel: string | null;
}) {
  return (
    <>
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
    </>
  );
}
