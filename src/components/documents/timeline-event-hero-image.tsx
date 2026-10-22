"use client";

import { automotiveHeroShellClassName } from "@/components/ui/automotive/primitives";
import { cn } from "@/lib/utils";

export type TimelineEventHeroImageProps = {
  src: string;
  alt?: string;
  className?: string;
};

/**
 * Document / Umbau photo in the same visual language as the dashboard vehicle hero.
 */
export function TimelineEventHeroImage({
  src,
  alt = "",
  className,
}: TimelineEventHeroImageProps) {
  return (
    <div
      className={cn(
        automotiveHeroShellClassName,
        "relative mt-3 min-h-[10.5rem] w-full overflow-hidden sm:min-h-[11rem]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-[50%_62%]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-zinc-950/50 to-zinc-950/5"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-zinc-950/65 via-zinc-950/10 to-transparent"
      />
    </div>
  );
}
