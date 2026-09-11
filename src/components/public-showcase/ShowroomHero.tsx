"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Expand } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

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

function useHeroScrollMotion() {
  const scrollTrackRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: scrollTrackRef,
    offset: ["start start", "end end"],
  });

  const textOpacity = useTransform(
    scrollYProgress,
    [0, 0.35, 0.75],
    [1, 1, 0],
  );
  const textY = useTransform(scrollYProgress, [0, 1], [0, -48]);

  return {
    scrollTrackRef,
    textOpacity,
    textY,
  };
}

type HeroBackdropProps = {
  profile: PublicShowcaseProfile;
  title: string;
  heroImageClass: string;
  visiblePhotosCount: number;
  onOpenGallery: () => void;
};

function HeroBackdrop({
  profile,
  title,
  heroImageClass,
  visiblePhotosCount,
  onOpenGallery,
}: HeroBackdropProps) {
  return (
    <div className="absolute inset-0 bg-black" aria-hidden>
      {profile.heroImageSrc ? (
        <button
          type="button"
          onClick={onOpenGallery}
          disabled={visiblePhotosCount === 0}
          className="relative block h-full w-full disabled:cursor-default"
          aria-label={`${title || "Fahrzeugfoto"} in Galerie öffnen`}
        >
          <Image
            src={profile.heroImageSrc}
            alt=""
            fill
            priority
            unoptimized
            className={heroImageClass}
            sizes="100vw"
          />
          {visiblePhotosCount > 0 ? (
            <span
              aria-hidden
              className="absolute bottom-[38%] right-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white/90 backdrop-blur-sm"
            >
              <Expand className="h-4 w-4" />
            </span>
          ) : null}
        </button>
      ) : null}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black via-black/55 to-transparent"
        aria-hidden
      />
    </div>
  );
}

export function ShowroomHero({ profile, photos }: ShowroomHeroProps) {
  const title = [profile.make, profile.model].filter(Boolean).join(" ");
  const yearLabel = profile.year ? String(profile.year) : null;
  const visiblePhotos = useMemo(
    () => filterVisibleGalleryPhotos(photos),
    [photos],
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();
  const scrollMotionEnabled = Boolean(profile.heroImageSrc) && !reduceMotion;

  const heroScroll = useHeroScrollMotion();

  const heroGalleryIndex = profile.heroImageSrc
    ? visiblePhotos.findIndex((photo) => photo.src === profile.heroImageSrc)
    : -1;

  function openHeroInGallery() {
    if (visiblePhotos.length === 0 || !profile.heroImageSrc) return;
    setLightboxIndex(heroGalleryIndex >= 0 ? heroGalleryIndex : 0);
  }

  const heroSrc = profile.heroImageSrc ?? "";
  const heroIsVector =
    heroSrc.includes(".svg") || heroSrc.includes("dyno-chart");
  const heroImageClass = heroIsVector
    ? "object-contain object-top px-3 pb-[38%] pt-[max(3.5rem,env(safe-area-inset-top))]"
    : "object-cover object-[center_42%]";

  const scrollTrackClass = scrollMotionEnabled
    ? showroom.heroScrollTrack
    : showroom.heroMinHeight;

  const textLayerClass = `pointer-events-none relative z-10 flex ${showroom.heroMinHeight} flex-col justify-end px-5 pb-10 pt-[max(4.5rem,env(safe-area-inset-top))]`;

  return (
    <>
      <header
        ref={heroScroll.scrollTrackRef}
        className={`relative z-0 isolate ${scrollTrackClass}`}
      >
        <div
          className={`sticky top-0 z-0 ${showroom.heroMinHeight} overflow-hidden`}
        >
          <HeroBackdrop
            profile={profile}
            title={title}
            heroImageClass={heroImageClass}
            visiblePhotosCount={visiblePhotos.length}
            onOpenGallery={openHeroInGallery}
          />

          {scrollMotionEnabled ? (
            <motion.div
              className={textLayerClass}
              style={{ opacity: heroScroll.textOpacity, y: heroScroll.textY }}
            >
              <HeroCopy
                profile={profile}
                title={title}
                yearLabel={yearLabel}
              />
            </motion.div>
          ) : (
            <div className={textLayerClass}>
              <HeroCopy
                profile={profile}
                title={title}
                yearLabel={yearLabel}
              />
            </div>
          )}
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
