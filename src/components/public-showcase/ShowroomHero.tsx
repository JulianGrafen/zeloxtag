"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import Image from "next/image";
import { Expand } from "lucide-react";
import { motion } from "framer-motion";

import { formatPublicVehicleTitle } from "@/lib/vehicles/format-public-vehicle-title";
import {
  instagramHandleLabel,
  instagramProfileUrl,
} from "@/lib/vehicles/instagram-handle";
import type {
  PublicGalleryPhoto,
  PublicShowcaseProfile,
} from "@/lib/vehicles/public-showcase-data";
import { cn } from "@/lib/utils";

import {
  filterVisibleGalleryPhotos,
  photoUsesContainLayout,
  resolveHeroPhotoIndex,
} from "./showcase-gallery-photos";
import { ShowroomGalleryLightbox } from "./ShowroomGalleryLightbox";
import { InstagramGlyph } from "./InstagramGlyph";
import { ShowroomBrandBanner } from "./ShowroomBrandBanner";
import {
  HERO_KEN_BURNS_DURATION_S,
  useShowroomMotion,
} from "./showroom-motion";
import { showroom } from "./showroom-styles";

type ShowroomHeroProps = {
  profile: PublicShowcaseProfile;
  photos: PublicGalleryPhoto[];
};

export type HeroCarouselHandle = {
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
};

type HeroBackdropProps = {
  photos: PublicGalleryPhoto[];
  initialIndex: number;
  activeIndex: number;
  title: string;
  carouselRef: RefObject<HeroCarouselHandle | null>;
  onActiveIndexChange: (index: number) => void;
  onOpenAtIndex: (index: number) => void;
};

function HeroBackdrop({
  photos,
  initialIndex,
  activeIndex,
  title,
  carouselRef,
  onActiveIndexChange,
  onOpenAtIndex,
}: HeroBackdropProps) {
  const motionConfig = useShowroomMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const el = scrollerRef.current;
      if (!el || el.clientWidth <= 0) return;
      const clamped = Math.max(0, Math.min(photos.length - 1, index));
      el.scrollTo({ left: clamped * el.clientWidth, behavior });
      onActiveIndexChange(clamped);
    },
    [onActiveIndexChange, photos.length],
  );

  useEffect(() => {
    carouselRef.current = { scrollToIndex };
    return () => {
      carouselRef.current = null;
    };
  }, [carouselRef, scrollToIndex]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollToIndex(initialIndex, "auto");
    });
    return () => cancelAnimationFrame(frame);
  }, [initialIndex, scrollToIndex]);

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth <= 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    onActiveIndexChange(
      Math.max(0, Math.min(photos.length - 1, index)),
    );
  }, [onActiveIndexChange, photos.length]);

  if (photos.length === 0) {
    return (
      <div className="absolute inset-0 bg-black" aria-hidden>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-black from-[18%] via-black/80 to-transparent"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black">
      <motion.div
        className="absolute inset-0"
        variants={motionConfig.heroImageSettle}
        initial="hidden"
        animate="visible"
      >
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="region"
          aria-roledescription="Karussell"
          aria-label="Fahrzeugfotos"
        >
          {photos.map((photo, index) => {
            const contain = photoUsesContainLayout(photo.src);
            const imageClass = contain
              ? "object-contain object-top px-3 pb-[38%] pt-[max(3.5rem,env(safe-area-inset-top))]"
              : "object-cover object-[center_42%]";
            const kenBurnsActive =
              motionConfig.enableHeroKenBurns &&
              !contain &&
              index === activeIndex;

            return (
              <div
                key={photo.id}
                className="relative h-full min-w-full shrink-0 snap-center"
                aria-hidden={index !== activeIndex}
              >
                <button
                  type="button"
                  onClick={() => onOpenAtIndex(index)}
                  className="relative block h-full w-full text-left"
                  aria-label={`${photo.alt || title} vergrößern`}
                >
                  <motion.div
                    className="absolute inset-0"
                    animate={
                      kenBurnsActive
                        ? {
                            scale: [1, 1.06],
                            transition: {
                              duration: HERO_KEN_BURNS_DURATION_S,
                              ease: "linear" as const,
                              repeat: Infinity,
                              repeatType: "reverse" as const,
                            },
                          }
                        : { scale: 1 }
                    }
                    style={{ transformOrigin: "center 42%" }}
                  >
                    <Image
                      src={photo.src}
                      alt={index === activeIndex ? photo.alt : ""}
                      fill
                      priority={index === initialIndex}
                      unoptimized
                      className={imageClass}
                      sizes="100vw"
                      draggable={false}
                    />
                  </motion.div>
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onOpenAtIndex(activeIndex)}
          className="pointer-events-auto absolute right-4 top-[max(4.25rem,calc(env(safe-area-inset-top)+3.25rem))] z-[1] inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white/90 backdrop-blur-sm"
          aria-label="Aktuelles Foto vergrößern"
        >
          <Expand className="h-4 w-4" aria-hidden />
        </button>
      </motion.div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[52%] bg-gradient-to-t from-black from-[18%] via-black/80 to-transparent"
        aria-hidden
      />
    </div>
  );
}

export function ShowroomHero({ profile, photos }: ShowroomHeroProps) {
  const title =
    formatPublicVehicleTitle(profile.make, profile.model) || "Fahrzeug";
  const yearLabel = profile.year ? String(profile.year) : null;
  const visiblePhotos = useMemo(
    () => filterVisibleGalleryPhotos(photos),
    [photos],
  );
  const initialIndex = useMemo(
    () => resolveHeroPhotoIndex(visiblePhotos, profile.heroImageSrc),
    [visiblePhotos, profile.heroImageSrc],
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const carouselRef = useRef<HeroCarouselHandle | null>(null);

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  return (
    <>
      <header
        className={`relative z-0 isolate ${showroom.heroMinHeight} overflow-hidden`}
      >
        <HeroBackdrop
          photos={visiblePhotos}
          initialIndex={initialIndex}
          activeIndex={activeIndex}
          title={title}
          carouselRef={carouselRef}
          onActiveIndexChange={setActiveIndex}
          onOpenAtIndex={(index) => setLightboxIndex(index)}
        />

        <ShowroomBrandBanner />

        <div
          className={`relative z-10 flex ${showroom.heroMinHeight} flex-col justify-end px-5 pb-8 pt-[max(4.5rem,env(safe-area-inset-top))]`}
        >
          {visiblePhotos.length > 1 ? (
            <HeroPhotoPagination
              photos={visiblePhotos}
              activeIndex={activeIndex}
              onSelect={(index) =>
                carouselRef.current?.scrollToIndex(index, "smooth")
              }
            />
          ) : null}
          <HeroCopy profile={profile} title={title} yearLabel={yearLabel} />
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

function HeroPhotoPagination({
  photos,
  activeIndex,
  onSelect,
}: {
  photos: PublicGalleryPhoto[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div
      className="pointer-events-auto mb-4 flex justify-center gap-2"
      role="tablist"
      aria-label="Fotoauswahl"
    >
      {photos.map((photo, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={photo.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`Foto ${index + 1} von ${photos.length}`}
            onClick={() => onSelect(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              isActive ? "w-6 bg-white" : "w-2 bg-white/35",
            )}
          />
        );
      })}
    </div>
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
  const motionConfig = useShowroomMotion();
  const instagramHandle = profile.instagramHandle;
  const hasMeta = Boolean(yearLabel || instagramHandle);

  return (
    <motion.div
      className="pointer-events-none max-w-[22rem]"
      variants={motionConfig.heroStaggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.h1
        variants={motionConfig.fadeUp}
        className="font-[family-name:var(--font-display)] text-[2.05rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[2.45rem]"
      >
        {title || "Fahrzeug"}
      </motion.h1>

      {hasMeta ? (
        <motion.p
          variants={motionConfig.fadeUp}
          className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.92rem] font-medium leading-snug text-white/55"
        >
          {yearLabel ? <span>Baujahr {yearLabel}</span> : null}
          {yearLabel && instagramHandle ? (
            <span aria-hidden className="text-white/30">·</span>
          ) : null}
          {instagramHandle ? (
            <a
              href={instagramProfileUrl(instagramHandle)}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto inline-flex min-h-9 max-w-full items-center gap-1.5 text-white/70 transition-colors hover:text-white/90"
            >
              <InstagramGlyph className="h-[0.95rem] w-[0.95rem] shrink-0 text-white/55" />
              <span className="truncate">
                {instagramHandleLabel(instagramHandle)}
              </span>
            </a>
          ) : null}
        </motion.p>
      ) : null}
    </motion.div>
  );
}
