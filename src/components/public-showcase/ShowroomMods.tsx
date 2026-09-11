"use client";

import { useState } from "react";

import type {
  PublicModification,
  PublicShowcaseProfile,
} from "@/lib/vehicles/public-showcase-data";

import { formatDocumentDate } from "@/lib/documents/format";
import { cn } from "@/lib/utils";

import { ModBadge } from "./ModBadge";
import { ShowroomDisclosure } from "./ShowroomDisclosure";
import { showroom } from "./showroom-styles";

type ShowroomModsProps = {
  profile: PublicShowcaseProfile;
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

function UmbautenSpecificationsBlock({ notes }: { notes: string }) {
  return (
    <div className="px-4 py-3.5">
      <p className={`whitespace-pre-wrap ${showroom.body}`}>{notes}</p>
    </div>
  );
}

function UmbautenList({
  modifications,
  specifications,
}: {
  modifications: PublicModification[];
  specifications: string | null;
}) {
  const hasMods = modifications.length > 0;
  const hasSpecs = Boolean(specifications);

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
              (!isLastMod || hasSpecs) && "border-b border-white/10",
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
      {hasSpecs ? (
        <UmbautenSpecificationsBlock notes={specifications!} />
      ) : null}
    </ul>
  );
}

export function ShowroomMods({
  profile,
  modifications,
  embedded = false,
}: ShowroomModsProps) {
  const specifications = profile.notes?.trim() ? profile.notes.trim() : null;
  const hasMods = modifications.length > 0;
  const hasSpecs = Boolean(specifications);
  const [open, setOpen] = useState(false);

  if (!hasMods && !hasSpecs) {
    return null;
  }

  const list = (
    <UmbautenList modifications={modifications} specifications={specifications} />
  );

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
