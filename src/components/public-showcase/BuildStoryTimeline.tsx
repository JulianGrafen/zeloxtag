"use client";

import Image from "next/image";
import { useCallback, useState, useTransition } from "react";

import {
  formatTimelineDate,
  formatTimelineMileage,
} from "@/lib/documents/timeline-format";
import type { BuildStoryEntry } from "@/lib/vehicles/build-story-map";
import { automotiveKickerClassName } from "@/components/ui/automotive";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { cn } from "@/lib/utils";

type BuildStoryTimelineProps = {
  slug: string;
  initialEntries: BuildStoryEntry[];
  initialHasMore: boolean;
};

const SPINE_DOT =
  "bg-emerald-400/95 shadow-[0_0_14px_rgba(52,211,153,0.5)] ring-1 ring-emerald-400/35";

export function BuildStoryTimeline({
  slug,
  initialEntries,
  initialHasMore,
}: BuildStoryTimelineProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadMore = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const params = new URLSearchParams({
          slug,
          offset: String(entries.length),
          limit: "12",
        });
        const response = await fetch(
          `/api/public/build-story?${params.toString()}`,
          { method: "GET", headers: { accept: "application/json" } },
        );
        if (!response.ok) {
          setError("Weitere Einträge konnten nicht geladen werden.");
          return;
        }
        const body = (await response.json()) as {
          entries?: BuildStoryEntry[];
          hasMore?: boolean;
        };
        const next = Array.isArray(body.entries) ? body.entries : [];
        setEntries((prev) => [...prev, ...next]);
        setHasMore(Boolean(body.hasMore));
      } catch {
        setError("Weitere Einträge konnten nicht geladen werden.");
      }
    });
  }, [entries.length, slug]);

  if (entries.length === 0) {
    return (
      <section
        aria-label="Build Story"
        className="px-4"
      >
        <h2 className={automotiveKickerClassName}>Build Story</h2>
        <p className="zt-card mt-3 rounded-xl px-4 py-5 text-center text-sm text-zinc-400">
          Die Story dieses Builds beginnt gerade erst…
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Build Story" className="px-4">
      <h2 className={automotiveKickerClassName}>Build Story</h2>
      <ol className="relative mt-5 space-y-8 pl-6">
        <div
          aria-hidden
          className="absolute bottom-2 left-[0.4375rem] top-2 w-px bg-gradient-to-b from-emerald-400/25 via-white/10 to-transparent"
        />
        {entries.map((entry, index) => (
          <li key={entry.id} className="relative">
            <span
              aria-hidden
              className={cn(
                "absolute -left-6 top-5 h-2.5 w-2.5 rounded-full",
                SPINE_DOT,
              )}
            />
            <article
              className={cn(
                "overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50",
                index === 0 ? "mt-0" : "",
              )}
            >
              <div className="relative aspect-[4/5] w-full max-w-lg bg-zinc-950">
                <Image
                  src={entry.imageSrc}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 512px) 100vw, 512px"
                  loading="lazy"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="font-mono text-sm tracking-tight text-zinc-400 tabular-nums">
                    {formatTimelineDate(entry.date)}
                    {entry.mileageKm != null
                      ? ` · ${formatTimelineMileage(entry.mileageKm)}`
                      : ""}
                  </p>
                  <h3 className="mt-1 font-semibold text-zinc-100">
                    {entry.title}
                  </h3>
                  {entry.subtitle ? (
                    <p className="mt-0.5 text-sm text-zinc-400">
                      {entry.subtitle}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          </li>
        ))}
      </ol>
      {error ? (
        <p className="mt-4 text-center text-sm text-red-400/90">{error}</p>
      ) : null}
      {hasMore ? (
        <div className="mt-6 flex justify-center">
          <PressableButton
            type="button"
            variant="button"
            disabled={pending}
            onClick={loadMore}
            className="min-h-11 rounded-full border border-white/15 bg-zinc-900/80 px-6 text-sm font-medium text-zinc-100"
          >
            {pending ? "Laden…" : "Mehr anzeigen"}
          </PressableButton>
        </div>
      ) : null}
    </section>
  );
}
