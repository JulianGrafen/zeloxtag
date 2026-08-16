"use client";

import { useState } from "react";
import { ChevronDown, Wrench } from "lucide-react";

import {
  groupPublicModifications,
  type PublicModification,
} from "@/lib/vehicles/public-showcase-data";

import { ModBadge } from "./ModBadge";

type ShowroomModsProps = {
  modifications: PublicModification[];
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("de-DE", {
    month: "short",
    year: "numeric",
  });
}

export function ShowroomMods({ modifications }: ShowroomModsProps) {
  const groups = groupPublicModifications(modifications);
  const [openCategory, setOpenCategory] = useState<string | null>(
    groups[0]?.category ?? null,
  );

  return (
    <section className="px-4">
      <div className="mb-3 flex items-center gap-2">
        <Wrench className="h-4 w-4 text-emerald-400" aria-hidden />
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Spezifikationen
        </h2>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-[0.88rem] text-zinc-400 backdrop-blur-md">
          Noch keine öffentlichen Umbauten hinterlegt.
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const open = openCategory === group.category;
            const panelId = `showroom-mod-${group.category}`;

            return (
              <div
                key={group.category}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md"
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() =>
                    setOpenCategory(open ? null : group.category)
                  }
                  className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="text-[0.92rem] font-semibold text-zinc-50">
                    {group.category}
                  </span>
                  <span className="flex items-center gap-2 text-zinc-400">
                    <span className="text-[0.72rem] tabular-nums">
                      {group.items.length}
                    </span>
                    <ChevronDown
                      className={[
                        "h-4 w-4 transition-transform",
                        open ? "rotate-180" : "",
                      ].join(" ")}
                      aria-hidden
                    />
                  </span>
                </button>
                {open ? (
                  <ul id={panelId} className="border-t border-white/10 px-2 pb-2">
                    {group.items.map((mod) => {
                      const dateLabel = formatDate(mod.date);
                      return (
                        <li
                          key={mod.id}
                          className="flex items-start justify-between gap-3 px-2 py-3"
                        >
                          <div className="min-w-0">
                            <p className="font-medium leading-snug text-zinc-100">
                              {mod.label}
                            </p>
                            {dateLabel ? (
                              <p className="mt-0.5 text-[0.72rem] text-zinc-500">
                                {dateLabel}
                              </p>
                            ) : null}
                          </div>
                          {mod.vendor ? <ModBadge>{mod.vendor}</ModBadge> : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
