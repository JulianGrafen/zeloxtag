"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { FotodokuGalleryLightbox } from "@/components/documents/fotodoku-gallery-lightbox";
import { cn } from "@/lib/utils";

export type FotodokuGallerySlide = {
  src: string;
  alt: string;
};

type DocumentFotodokuGalleryProps = {
  slides: readonly FotodokuGallerySlide[];
  className?: string;
  /** Tap-to-zoom fullscreen (Photos-style). */
  enableLightbox?: boolean;
  /** `photos` = main stage + thumbnail strip (Apple-like). */
  layout?: "default" | "photos";
};

const SCROLLER_CLASS =
  "flex h-full w-full touch-pan-x snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const THUMB_SCROLLER_CLASS =
  "flex gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function DocumentFotodokuGallery({
  slides,
  className,
  enableLightbox = true,
  layout = "default",
}: DocumentFotodokuGalleryProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const thumbScrollerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const el = scrollerRef.current;
      if (!el || el.clientWidth <= 0) return;
      const clamped = Math.max(0, Math.min(slides.length - 1, index));
      el.scrollTo({ left: clamped * el.clientWidth, behavior });
      indexRef.current = clamped;
      setActiveIndex(clamped);
    },
    [slides.length],
  );

  const syncIndexFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth <= 0 || slides.length === 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    const clamped = Math.max(0, Math.min(slides.length - 1, next));
    if (clamped !== indexRef.current) {
      indexRef.current = clamped;
      setActiveIndex(clamped);
    }
  }, [slides.length]);

  useEffect(() => {
    indexRef.current = 0;
    setActiveIndex(0);
    const el = scrollerRef.current;
    if (!el) return;
    const frame = window.requestAnimationFrame(() => {
      el.scrollLeft = 0;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [slides]);

  useEffect(() => {
    const thumbEl = thumbScrollerRef.current;
    if (!thumbEl || layout !== "photos" || slides.length <= 1) return;
    const activeThumb = thumbEl.querySelector<HTMLElement>(
      `[data-thumb-index="${activeIndex}"]`,
    );
    activeThumb?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeIndex, layout, slides.length]);

  if (slides.length === 0) {
    return null;
  }

  const photosLayout = layout === "photos";
  const showThumbnails = photosLayout && slides.length > 1;
  const showDots = !photosLayout && slides.length > 1;
  const mainMaxHeight = photosLayout ? "max-h-[38vh]" : "max-h-[50vh]";
  const mainMinHeight = photosLayout ? "min-h-[10rem]" : "min-h-[12rem]";

  return (
    <div className={className}>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-[color:var(--vd-border)]",
          photosLayout
            ? "bg-black/45"
            : "bg-neutral-950/90",
          mainMinHeight,
          mainMaxHeight,
        )}
        aria-roledescription="Karussell"
        aria-label="Fotodoku"
      >
        {slides.length > 1 ? (
          <p
            className={cn(
              "pointer-events-none absolute right-2 top-2 z-10 rounded-full px-2.5 py-0.5 text-[0.68rem] font-medium tabular-nums backdrop-blur-sm",
              photosLayout
                ? "border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]/92 text-[color:var(--vd-text)]"
                : "bg-black/55 text-white/90",
            )}
          >
            {activeIndex + 1} / {slides.length}
          </p>
        ) : null}

        <div
          ref={scrollerRef}
          className={cn(SCROLLER_CLASS, "h-full")}
          onScroll={syncIndexFromScroll}
        >
          {slides.map((slide, index) => (
            <div
              key={`${slide.src}-${index}`}
              className="flex h-full min-w-full shrink-0 snap-center snap-always items-center justify-center bg-neutral-950"
              aria-hidden={index !== activeIndex}
            >
              {enableLightbox ? (
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="flex h-full w-full cursor-zoom-in items-center justify-center border-0 bg-transparent p-0"
                  aria-label={`${slide.alt} im Vollbild anzeigen`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    className={cn(
                      "mx-auto w-full object-contain",
                      photosLayout ? "max-h-[38vh]" : "max-h-[50vh]",
                    )}
                    draggable={false}
                  />
                </button>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.src}
                  alt={slide.alt}
                  className={cn(
                    "mx-auto w-full object-contain",
                    photosLayout ? "max-h-[38vh]" : "max-h-[50vh]",
                  )}
                  draggable={false}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {showThumbnails ? (
        <div
          ref={thumbScrollerRef}
          className={cn(THUMB_SCROLLER_CLASS, "mt-3 px-0.5")}
          role="tablist"
          aria-label="Foto-Thumbnails"
        >
          {slides.map((slide, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={`thumb-${slide.src}-${index}`}
                type="button"
                role="tab"
                data-thumb-index={index}
                aria-selected={isActive}
                aria-label={`Foto ${index + 1} von ${slides.length}`}
                onClick={() => scrollToIndex(index)}
                className={cn(
                  "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-[border-color,opacity,transform]",
                  isActive
                    ? "border-[color:var(--vd-accent)] opacity-100 ring-2 ring-[color:var(--vd-accent)]/35"
                    : "border-[color:var(--vd-border)] opacity-60 hover:opacity-85",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.src}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {showDots ? (
        <div className="mt-3 flex flex-col items-center gap-2">
          <p className="text-[0.75rem] font-medium tabular-nums text-[color:var(--vd-muted)]">
            Foto {activeIndex + 1} von {slides.length}
          </p>
          <div
            className="flex justify-center gap-1.5"
            role="tablist"
            aria-label="Fotoauswahl"
          >
            {slides.map((_, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={index}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Foto ${index + 1} von ${slides.length}`}
                  className={`h-2 rounded-full transition-all ${
                    isActive
                      ? "w-5 bg-neutral-900"
                      : "w-2 bg-neutral-300"
                  }`}
                  onClick={() => scrollToIndex(index)}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {lightboxIndex !== null ? (
        <FotodokuGalleryLightbox
          slides={slides}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </div>
  );
}
