"use client";

import { useState } from "react";

import type { PublicModification } from "@/lib/vehicles/public-showcase-data";

import { formatDocumentDate } from "@/lib/documents/format";
import { cn } from "@/lib/utils";

import { ModBadge } from "./ModBadge";
import { ShowroomDisclosure } from "./ShowroomDisclosure";
import { showroom } from "./showroom-styles";

type ShowroomModsProps = {
  modifications: PublicModification[];
  embedded?: boolean;
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const label = formatDocumentDate(iso);
  return label === "Ohne Datum" ? null : label;
}

function umbautenSubtitle(
  modifications: PublicModification[],
  open: boolean,
): string | undefined {
  if (open || modifications.length === 0) return undefined;
  const count = modifications.length;
  return count === 1 ? "1 Eintrag" : `${count} Einträge`;
}

function UmbautenList({ modifications }: { modifications: PublicModification[] }) {
  return (
    <ul id="showroom-mods-list">
      {modifications.map((mod, index) => {
        const dateLabel = formatDate(mod.date);
        const isLastMod = index === modifications.length - 1;
        return (
          <li
            key={mod.id}
            className={cn(
              "flex items-start justify-between gap-3 px-4 py-3",
              !isLastMod && "border-b border-white/10",
            )}
          >
            <div className="min-w-0">
              <p className="text-[0.94rem] font-medium leading-snug text-white">
                {mod.label}
              </p>
              {dateLabel ? (
                <p className="mt-0.5 text-[0.78rem] text-white/45">
                  {dateLabel}
                </p>
              ) : null}
            </div>
            {mod.vendor ? <ModBadge>{mod.vendor}</ModBadge> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function ShowroomMods({
  modifications,
  embedded = false,
}: ShowroomModsProps) {
  const [open, setOpen] = useState(false);

  if (modifications.length === 0) {
    return null;
  }

  const list = <UmbautenList modifications={modifications} />;

  const subtitle = umbautenSubtitle(modifications, open);

  const disclosure = (
    <ShowroomDisclosure
      title="Umbauten"
      subtitle={subtitle}
      open={open}
      onToggle={() => setOpen((value) => !value)}
      panelId="showroom-mods-list"
      collapsible
    >
      {list}
    </ShowroomDisclosure>
  );

  if (embedded) {
    return disclosure;
  }

  return <div className={showroom.panelFlat}>{disclosure}</div>;
}
