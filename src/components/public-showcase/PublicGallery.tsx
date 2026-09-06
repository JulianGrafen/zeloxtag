"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Expand } from "lucide-react";

import type { PublicGalleryPhoto } from "@/lib/vehicles/public-showcase-data";

import { ShowroomGalleryLightbox } from "./ShowroomGalleryLightbox";
import { showroom } from "./showroom-styles";

type PublicGalleryProps = {
  photos: PublicGalleryPhoto[];
};

export function filterVisibleGalleryPhotos(
  photos: readonly PublicGalleryPhoto[],
): PublicGalleryPhoto[] {
  return [...photos];
}

export function PublicGallery({ photos }: PublicGalleryProps) {
  const visible = useMemo(() => filterVisibleGalleryPhotos(photos), [photos]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (visible.length === 0) return null;

  return (
    <>
      <section className="px-4">
        <h2 className={`mb-3 ${showroom.sectionTitle}`}>Galerie</h2>
        <ul className="grid grid-cols-2 gap-2.5">
          {visible.map((photo, index) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setLightboxIndex(index)}
                className="group relative block aspect-[4/3] w-full overflow-hidden rounded-[1.25rem] border border-white/15 bg-white/[0.03] text-left"
                aria-label={`${photo.alt} vergrößern`}
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-200 group-active:scale-[1.02]"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-80"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white/90 backdrop-blur-sm"
                >
                  <Expand className="h-3.5 w-3.5" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {lightboxIndex !== null ? (
        <ShowroomGalleryLightbox
          photos={visible}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  );
}
