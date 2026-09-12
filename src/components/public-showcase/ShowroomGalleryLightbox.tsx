"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import type { PublicGalleryPhoto } from "@/lib/vehicles/public-showcase-data";

type ShowroomGalleryLightboxProps = {
  photos: PublicGalleryPhoto[];
  initialIndex: number;
  onClose: () => void;
};

export function ShowroomGalleryLightbox({
  photos,
  initialIndex,
  onClose,
}: ShowroomGalleryLightboxProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(initialIndex);
  const [index, setIndex] = useState(initialIndex);

  const scrollToIndex = useCallback(
    (target: number, behavior: ScrollBehavior = "smooth") => {
      const el = scrollerRef.current;
      if (!el || el.clientWidth <= 0) return;
      const clamped = Math.max(0, Math.min(photos.length - 1, target));
      el.scrollTo({ left: clamped * el.clientWidth, behavior });
      indexRef.current = clamped;
      setIndex(clamped);
    },
    [photos.length],
  );

  useEffect(() => {
    indexRef.current = initialIndex;
    setIndex(initialIndex);
    const el = scrollerRef.current;
    if (!el) return;
    const frame = window.requestAnimationFrame(() => {
      el.scrollLeft = initialIndex * el.clientWidth;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialIndex]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const syncIndexFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth <= 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    const clamped = Math.max(0, Math.min(photos.length - 1, next));
    if (clamped !== indexRef.current) {
      indexRef.current = clamped;
      setIndex(clamped);
    }
  }, [photos.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowLeft") {
        scrollToIndex(indexRef.current - 1);
      }
      if (event.key === "ArrowRight") {
        scrollToIndex(indexRef.current + 1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, scrollToIndex]);

  const current = photos[index];
  if (!current) return null;

  const canGoBack = index > 0;
  const canGoForward = index < photos.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Fotogalerie"
    >
      <div
        className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]"
      >
        <p className="text-[0.78rem] font-medium tabular-nums text-white/70">
          {index + 1} / {photos.length}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/90"
          aria-label="Galerie schließen"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollerRef}
          onScroll={syncIndexFromScroll}
          className="flex h-full touch-pan-x snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative flex h-full min-w-full shrink-0 snap-center items-center justify-center px-3"
            >
              <div className="relative h-full w-full max-h-[min(72dvh,100%)]">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  unoptimized
                  className="object-contain"
                  sizes="100vw"
                  draggable={false}
                />
              </div>
            </div>
          ))}
        </div>

        {photos.length > 1 ? (
          <>
            <button
              type="button"
              disabled={!canGoBack}
              onClick={() => scrollToIndex(index - 1)}
              className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-2 text-white/90 backdrop-blur-sm disabled:opacity-30 sm:inline-flex"
              aria-label="Vorheriges Bild"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              disabled={!canGoForward}
              onClick={() => scrollToIndex(index + 1)}
              className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-2 text-white/90 backdrop-blur-sm disabled:opacity-30 sm:inline-flex"
              aria-label="Nächstes Bild"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      <p className="line-clamp-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-center text-[0.82rem] text-white/60">
        {current.alt}
      </p>
    </div>
  );
}
