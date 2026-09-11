"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Expand } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
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

const HERO_PERSPECTIVE_PX = 1200;

type ShowroomHeroProps = {
  profile: PublicShowcaseProfile;
  photos: PublicGalleryPhoto[];
};

/** Scroll-driven 3D drift for the vehicle layer (not page zoom). */
function useVehicleScrollDepth() {
  const scrollTrackRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: scrollTrackRef,
    offset: ["start start", "end end"],
  });

  const vehicleY = useTransform(scrollYProgress, [0, 1], ["6%", "-24%"]);
  const vehicleZ = useTransform(scrollYProgress, [0, 1], [48, -120]);
  const vehicleRotateY = useTransform(scrollYProgress, [0, 1], [7, -16]);
  const vehicleRotateX = useTransform(scrollYProgress, [0, 1], [2, -10]);
  const vehicleX = useTransform(scrollYProgress, [0, 1], [0, 12]);
  const floorOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [0.35, 0.2, 0]);

  return {
    scrollTrackRef,
    vehicleY,
    vehicleZ,
    vehicleRotateY,
    vehicleRotateX,
    vehicleX,
    floorOpacity,
  };
}

type HeroBackdropProps = {
  profile: PublicShowcaseProfile;
  title: string;
  heroImageClass: string;
  visiblePhotosCount: number;
  onOpenGallery: () => void;
  depthEnabled: boolean;
  vehicleY: MotionValue<string>;
  vehicleZ: MotionValue<number>;
  vehicleRotateY: MotionValue<number>;
  vehicleRotateX: MotionValue<number>;
  vehicleX: MotionValue<number>;
  floorOpacity: MotionValue<number>;
};

function HeroBackdrop({
  profile,
  title,
  heroImageClass,
  visiblePhotosCount,
  onOpenGallery,
  depthEnabled,
  vehicleY,
  vehicleZ,
  vehicleRotateY,
  vehicleRotateX,
  vehicleX,
  floorOpacity,
}: HeroBackdropProps) {
  const mediaLayer = profile.heroImageSrc ? (
    <button
      type="button"
      onClick={onOpenGallery}
      disabled={visiblePhotosCount === 0}
      className="relative block h-[108%] w-full -translate-y-[4%] disabled:cursor-default"
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
  ) : null;

  const gradient = (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black via-black/55 to-transparent"
      aria-hidden
    />
  );

  if (!depthEnabled) {
    return (
      <div className="absolute inset-0 bg-black" aria-hidden>
        <div className="relative h-full w-full">{mediaLayer}</div>
        {gradient}
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-black"
      style={{ perspective: HERO_PERSPECTIVE_PX }}
      aria-hidden
    >
      <motion.div
        className="absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]"
        style={{
          y: vehicleY,
          z: vehicleZ,
          rotateY: vehicleRotateY,
          rotateX: vehicleRotateX,
          x: vehicleX,
          transformPerspective: HERO_PERSPECTIVE_PX,
        }}
      >
        <div className="relative h-[88%] w-full max-w-[118%] [transform-style:preserve-3d]">
          {mediaLayer}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-[12%] bottom-[18%] h-10 rounded-[100%] bg-white/20 blur-2xl"
            style={{ opacity: floorOpacity }}
          />
        </div>
      </motion.div>
      {gradient}
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
  const depthEnabled = Boolean(profile.heroImageSrc) && !reduceMotion;

  const vehicleDepth = useVehicleScrollDepth();

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
    ? "object-contain object-center px-2"
    : "object-contain object-center";

  const scrollTrackClass = depthEnabled
    ? showroom.heroScrollTrack
    : showroom.heroMinHeight;

  const textLayerClass = `pointer-events-none relative z-10 flex ${showroom.heroMinHeight} flex-col justify-end px-5 pb-10 pt-[max(4.5rem,env(safe-area-inset-top))]`;

  return (
    <>
      <header
        ref={vehicleDepth.scrollTrackRef}
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
            depthEnabled={depthEnabled}
            vehicleY={vehicleDepth.vehicleY}
            vehicleZ={vehicleDepth.vehicleZ}
            vehicleRotateY={vehicleDepth.vehicleRotateY}
            vehicleRotateX={vehicleDepth.vehicleRotateX}
            vehicleX={vehicleDepth.vehicleX}
            floorOpacity={vehicleDepth.floorOpacity}
          />

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
