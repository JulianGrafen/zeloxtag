import Image from "next/image";

import type { PublicGalleryPhoto } from "@/lib/vehicles/public-showcase-data";

type PublicGalleryProps = {
  photos: PublicGalleryPhoto[];
};

export function PublicGallery({ photos }: PublicGalleryProps) {
  if (photos.length === 0) {
    return (
      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]">
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          Galerie
        </h2>
        <p className="mt-3 text-[0.88rem] text-[color:var(--vd-muted)]">
          Noch keine öffentlichen Fotos hinterlegt.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
      <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
        Galerie
      </h2>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {photos.map((photo) => (
          <li
            key={photo.id}
            className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]"
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
