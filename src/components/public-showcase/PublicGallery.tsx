import Image from "next/image";

import type { PublicGalleryPhoto } from "@/lib/vehicles/public-showcase-data";

type PublicGalleryProps = {
  photos: PublicGalleryPhoto[];
};

export function PublicGallery({ photos }: PublicGalleryProps) {
  const visible = photos.filter((photo) => photo.id !== "silhouette" || photos.length === 1);
  if (visible.length === 0) return null;

  return (
    <section className="px-4">
      <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-zinc-400">
        Galerie
      </h2>
      <ul className="grid grid-cols-2 gap-2.5">
        {visible.map((photo) => (
          <li
            key={photo.id}
            className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-white/5"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
