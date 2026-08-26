"use client";

import { Wrench } from "lucide-react";

import type { PublicModification } from "@/lib/vehicles/public-showcase-data";

import { ModBadge } from "./ModBadge";
import { showroom } from "./showroom-styles";

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
  return (
    <section className="px-4">
      <div className="mb-3 flex items-center gap-2">
        <Wrench className={`h-4 w-4 ${showroom.icon}`} aria-hidden />
        <h2 className={showroom.sectionTitle}>Umbauten</h2>
      </div>

      {modifications.length === 0 ? (
        <p className={`${showroom.panelFlat} px-4 py-5 ${showroom.body}`}>
          Noch keine öffentlichen Umbauten hinterlegt.
        </p>
      ) : (
        <ul className={showroom.panel}>
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
      )}
    </section>
  );
}
