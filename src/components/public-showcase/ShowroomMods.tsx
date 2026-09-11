"use client";

import { useState } from "react";
import { ChevronDown, Wrench } from "lucide-react";

import type { PublicModification } from "@/lib/vehicles/public-showcase-data";

import { formatDocumentDate } from "@/lib/documents/format";
import { cn } from "@/lib/utils";

import { ModBadge } from "./ModBadge";
import { showroom } from "./showroom-styles";

const COLLAPSED_BY_DEFAULT_MIN_ITEMS = 5;

type ShowroomModsProps = {
  modifications: PublicModification[];
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const label = formatDocumentDate(iso);
  return label === "Ohne Datum" ? null : label;
}

export function ShowroomMods({ modifications }: ShowroomModsProps) {
  const [open, setOpen] = useState(
    () => modifications.length < COLLAPSED_BY_DEFAULT_MIN_ITEMS,
  );

  return (
    <section className="px-4">
      {modifications.length === 0 ? (
        <>
          <div className="mb-3 flex items-center gap-2">
            <Wrench className={`h-4 w-4 ${showroom.icon}`} aria-hidden />
            <h2 className={showroom.sectionTitle}>Umbauten</h2>
          </div>
          <p className={`${showroom.panelFlat} px-4 py-5 ${showroom.body}`}>
            Noch keine öffentlichen Umbauten hinterlegt.
          </p>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="mb-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl text-left"
            aria-expanded={open}
            aria-controls="showroom-mods-list"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Wrench className={`h-4 w-4 shrink-0 ${showroom.icon}`} aria-hidden />
              <h2 className={showroom.sectionTitle}>Umbauten</h2>
              <span className="text-[0.68rem] font-medium tabular-nums text-white/35">
                ({modifications.length})
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-white/45 transition-transform duration-300 ease-out",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </button>

          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-300 ease-out",
              open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <ul id="showroom-mods-list" className={showroom.panel}>
                {modifications.map((mod) => {
                  const dateLabel = formatDate(mod.date);
                  return (
                    <li
                      key={mod.id}
                      className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium leading-snug text-white/90">
                          {mod.label}
                        </p>
                        {dateLabel ? (
                          <p className="mt-0.5 text-[0.72rem] text-white/40">
                            {dateLabel}
                          </p>
                        ) : null}
                      </div>
                      {mod.vendor ? <ModBadge>{mod.vendor}</ModBadge> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
