"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type FotodokuGallerySlide = {
  src: string;
  alt: string;
};

type DocumentFotodokuGalleryProps = {
  slides: readonly FotodokuGallerySlide[];
  className?: string;
};

const SCROLLER_CLASS =
  "flex h-full w-full touch-pan-x snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function DocumentFotodokuGallery({
  slides,
  className,
}: DocumentFotodokuGalleryProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

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

  if (slides.length === 0) {
    return null;
  }

  const showPagination = slides.length > 1;

  return (
    <div className={className}>
      <div
        className="relative max-h-[50vh] min-h-[12rem] overflow-hidden rounded-xl bg-neutral-100"
        aria-roledescription="Karussell"
        aria-label="Fotodoku"
      >
        <div
          ref={scrollerRef}
          className={SCROLLER_CLASS}
          onScroll={syncIndexFromScroll}
        >
          {slides.map((slide, index) => (
            <div
              key={`${slide.src}-${index}`}
              className="flex h-full min-w-full shrink-0 snap-center snap-always items-center justify-center"
              aria-hidden={index !== activeIndex}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.src}
                alt={slide.alt}
                className="mx-auto max-h-[50vh] w-full object-contain"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {showPagination ? (
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
                  onClick={() => {
                    const el = scrollerRef.current;
                    if (!el || el.clientWidth <= 0) return;
                    el.scrollTo({
                      left: index * el.clientWidth,
                      behavior: "smooth",
                    });
                    indexRef.current = index;
                    setActiveIndex(index);
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
