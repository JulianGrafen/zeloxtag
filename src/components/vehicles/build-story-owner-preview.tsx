"use client";

import Image from "next/image";
import Link from "next/link";

import {
  formatTimelineDate,
  formatTimelineMileage,
} from "@/lib/documents/timeline-format";
import type { BuildStoryEntry } from "@/lib/vehicles/build-story-map";
import { cn } from "@/lib/utils";

type BuildStoryOwnerPreviewProps = {
  entries: BuildStoryEntry[];
  showcaseHref?: string | null;
  className?: string;
};

function previewImageUnoptimized(src: string): boolean {
  return src.startsWith("/api/");
}

export function BuildStoryOwnerPreview({
  entries,
  showcaseHref = null,
  className,
}: BuildStoryOwnerPreviewProps) {
  if (entries.length === 0) {
    return (
      <p className="px-4 py-3 text-[13px] leading-snug text-zinc-500">
        Noch keine Einträge in der Chronik — lege Umbauten mit Foto im
        Dashboard an und aktiviere dort „In Build-Story“.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3 px-3 pb-3 pt-1", className)}>
      <ol className="space-y-2">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex gap-3 overflow-hidden rounded-xl bg-black/30 p-2 ring-1 ring-white/10"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
              <Image
                src={entry.imageSrc}
                alt=""
                fill
                className="object-cover"
                sizes="64px"
                unoptimized={previewImageUnoptimized(entry.imageSrc)}
              />
            </div>
            <div className="min-w-0 flex-1 py-0.5">
              <p className="text-[11px] tabular-nums text-zinc-500">
                {formatTimelineDate(entry.date)}
                {entry.mileageKm != null
                  ? ` · ${formatTimelineMileage(entry.mileageKm)}`
                  : ""}
              </p>
              <p className="mt-0.5 truncate text-[14px] font-medium text-zinc-100">
                {entry.title}
              </p>
              {entry.subtitle ? (
                <p className="truncate text-[12px] text-zinc-500">
                  {entry.subtitle}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {showcaseHref ? (
        <Link
          href={showcaseHref}
          className="block px-1 text-center text-[13px] font-medium text-[#0A84FF]"
        >
          Vorschau im Showcase
        </Link>
      ) : null}
    </div>
  );
}
