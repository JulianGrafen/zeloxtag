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
import { ShowroomDiscoverBackButton } from "./showroom-discover-back-button";
import {
  HERO_KEN_BURNS_DURATION_S,
  useShowroomMotion,
} from "./showroom-motion";
import { preloadImageHrefs } from "@/lib/image/preload-image-hrefs";

import { showroom } from "./showroom-styles";

type ShowroomHeroProps = {
  profile: PublicShowcaseProfile;
  photos: PublicGalleryPhoto[];
  showDiscoverBack?: boolean;
  discoverBackHref?: string | null;
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

function heroImageClassName(src: string): string {
  const contain = photoUsesContainLayout(src);
  if (contain) {
    return "object-contain object-bottom px-2 pb-[28%] pt-[max(4.5rem,env(safe-area-inset-top))]";
  }
  return "object-cover object-[50%_55%]";
}

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
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/85"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black">
      <motion.div
        className={`absolute inset-x-0 top-0 z-[1] ${showroom.heroSwipeBand}`}
        variants={motionConfig.heroImageSettle}
        initial="hidden"
        animate="visible"
      >
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="flex h-full w-full touch-pan-x snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain overscroll-y-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="region"
          aria-roledescription="Karussell"
          aria-label="Fahrzeugfotos"
        >
          {photos.map((photo, index) => {
            const kenBurnsActive =
              motionConfig.enableHeroKenBurns &&
              !photoUsesContainLayout(photo.src) &&
              index === activeIndex;

            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => onOpenAtIndex(index)}
                className="relative h-full min-w-full shrink-0 cursor-zoom-in snap-center border-0 bg-transparent p-0 text-left"
                aria-label={`${photo.alt || title} im Vollbild anzeigen`}
                aria-hidden={index !== activeIndex}
                tabIndex={index === activeIndex ? 0 : -1}
              >
                <motion.div
                  className="pointer-events-none absolute inset-0"
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
                    alt={index === activeIndex ? photo.alt || title : ""}
                    fill
                    priority={
                      index === activeIndex ||
                      index === initialIndex ||
                      Math.abs(index - activeIndex) <= 1
                    }
                    loading={
                      Math.abs(index - activeIndex) <= 1 ? "eager" : "lazy"
                    }
                    unoptimized={photo.src.startsWith("/api/")}
                    className={`pointer-events-none ${heroImageClassName(photo.src)}`}
                    sizes="100vw"
                    draggable={false}
                  />
                </motion.div>
              </button>
            );
          })}
        </div>
      </motion.div>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[32%] bg-gradient-to-b from-black/70 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[min(58%,28rem)] bg-gradient-to-t from-black from-[22%] via-black/75 to-transparent"
        aria-hidden
      />
    </div>
  );
}

export function ShowroomHero({
  profile,
  photos,
  showDiscoverBack = false,
  discoverBackHref = null,
}: ShowroomHeroProps) {
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

  useEffect(() => {
    const neighbors = [
      visiblePhotos[activeIndex]?.src,
      visiblePhotos[activeIndex + 1]?.src,
      visiblePhotos[activeIndex - 1]?.src,
    ];
    preloadImageHrefs(neighbors);
  }, [activeIndex, visiblePhotos]);

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

        {showDiscoverBack ? (
          <ShowroomDiscoverBackButton backHref={discoverBackHref} />
        ) : null}

        {visiblePhotos.length > 0 ? (
          <button
            type="button"
            onClick={() => setLightboxIndex(activeIndex)}
            className="pointer-events-auto absolute right-3 top-[max(3.25rem,calc(env(safe-area-inset-top)+2.5rem))] z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white/90 backdrop-blur-sm"
            aria-label="Aktuelles Foto vergrößern"
          >
            <Expand className="h-4 w-4" aria-hidden />
          </button>
        ) : null}

        <div
          className={`pointer-events-none relative z-10 flex ${showroom.heroMinHeight} flex-col justify-end px-5 pb-8 pt-[max(4.5rem,env(safe-area-inset-top))]`}
        >
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[min(52%,26rem)] bg-gradient-to-t from-black via-black/85 to-transparent"
            aria-hidden
          />
          {visiblePhotos.length > 1 ? (
            <HeroPhotoPagination
              photos={visiblePhotos}
              activeIndex={activeIndex}
              onSelect={(index) =>
                carouselRef.current?.scrollToIndex(index, "smooth")
              }
            />
          ) : null}
          <div className="relative z-10 w-full">
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
      className="pointer-events-auto relative z-10 mb-4 flex justify-center gap-2"
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

  return (
    <motion.div
      className="pointer-events-none w-full max-w-none"
      variants={motionConfig.heroStaggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        variants={motionConfig.fadeUp}
        className="flex max-w-full items-end justify-between gap-4 drop-shadow-[0_4px_28px_rgba(0,0,0,0.75)]"
      >
        <h1
          className="min-w-0 flex-1 font-[family-name:var(--font-display)] text-[2.05rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[2.45rem]"
        >
          {title || "Fahrzeug"}
        </h1>
        {yearLabel ? (
          <p
            className="shrink-0 pb-0.5 text-right text-[0.92rem] font-medium leading-snug tabular-nums tracking-[-0.02em] text-white/75 sm:text-[1rem]"
          >
            <span className="block text-[0.68rem] font-normal uppercase tracking-[0.12em] text-white/45">
              Baujahr
            </span>
            <span className="text-[1.15rem] font-semibold text-white/90 sm:text-[1.25rem]">
              {yearLabel}
            </span>
          </p>
        ) : null}
      </motion.div>

      {instagramHandle ? (
        <motion.p
          variants={motionConfig.fadeUp}
          className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.92rem] font-medium leading-snug text-white/55"
        >
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
