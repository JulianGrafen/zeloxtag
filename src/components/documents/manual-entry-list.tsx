"use client";

import { ImagePlus, NotebookPen, Wrench, type LucideIcon } from "lucide-react";

import {
  AutomotiveEmptyPanel,
  AutomotiveList,
  AutomotiveListRow,
  AutomotiveSectionLabel,
} from "@/components/ui/automotive";
import type { IconBadgeTone } from "@/components/ui/ios";
import { displayDocumentTitle } from "@/lib/documents/format";
import { MANUAL_ENTRY_CATEGORY_LABELS } from "@/lib/documents/manual-entries";
import { isViewableDocumentUrl } from "@/lib/documents/viewable-url";
import { documentDetailHref } from "@/lib/vehicle-surface/documents-list-href";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import { cn } from "@/lib/utils";
import { formatCurrencyEUR, formatDateDE } from "@/utils/formatters";
import type { Document } from "@/types/database";

type EntryKind = "tuning" | "service" | "umbau";

const ENTRY_KIND_ICON: Record<EntryKind, { icon: LucideIcon; tone: IconBadgeTone }> = {
  tuning: { icon: Wrench, tone: "amber" },
  service: { icon: NotebookPen, tone: "blue" },
  umbau: { icon: ImagePlus, tone: "purple" },
};

type BadgeTone = "green" | "purple" | "neutral";

const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  green: "bg-emerald-500/15 text-emerald-400",
  purple: "bg-violet-500/15 text-violet-400",
  neutral: "bg-white/[0.08] text-[#EBEBF5]",
};

type EntryBadge = { label: string; tone: BadgeTone };

function entryBadges(doc: Document): EntryBadge[] {
  return [
    doc.show_on_build_story ? { label: "Build-Story", tone: "green" as const } : null,
    doc.show_on_public_showcase ? { label: "Showcase", tone: "purple" as const } : null,
    isViewableDocumentUrl(doc.file_url) ? { label: "Foto", tone: "neutral" as const } : null,
  ].filter((badge): badge is EntryBadge => badge !== null);
}

function EntryBadges({ badges }: { badges: EntryBadge[] }) {
  if (badges.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
            BADGE_TONE_CLASS[badge.tone],
          )}
        >
          {badge.label}
        </span>
      ))}
    </span>
  );
}

function ManualEntryRow({
  doc,
  href,
  isUmbau,
}: {
  doc: Document;
  href: string;
  isUmbau: boolean;
}) {
  const category = doc.category === "tuning" ? "tuning" : "service";
  const kindLabel = MANUAL_ENTRY_CATEGORY_LABELS[category];
  const { icon, tone } = ENTRY_KIND_ICON[isUmbau ? "umbau" : category];
  const meta = [doc.vendor?.trim() || kindLabel, formatDateDE(doc.date), kindLabel]
    .filter((part, index, parts) => part && parts.indexOf(part) === index)
    .join(" · ");
  const badges = entryBadges(doc);

  return (
    <AutomotiveListRow
      href={href}
      icon={icon}
      iconTone={tone}
      title={displayDocumentTitle(doc.title)}
      amount={doc.amount != null ? formatCurrencyEUR(doc.amount) : undefined}
      meta={meta}
      badge={badges.length > 0 ? <EntryBadges badges={badges} /> : undefined}
    />
  );
}

type ManualEntryListProps = {
  tagUuid: string;
  surfaceScope: VehicleSurfaceScope;
  isUmbau: boolean;
  totalCount: number;
  entries: Document[];
  emptyTitle: string;
  emptyBody: string;
};

export function ManualEntryList({
  tagUuid,
  surfaceScope,
  isUmbau,
  totalCount,
  entries,
  emptyTitle,
  emptyBody,
}: ManualEntryListProps) {
  const sectionLabel = isUmbau ? "Umbau-Bilder" : "Einträge";

  return (
    <section aria-label={isUmbau ? "Umbau-Bilder" : "Manuelle Einträge"}>
      <AutomotiveSectionLabel>{sectionLabel}</AutomotiveSectionLabel>
      {totalCount === 0 ? (
        <AutomotiveEmptyPanel>
          <p className="mb-1 text-[17px] font-semibold text-white">{emptyTitle}</p>
          <p>{emptyBody}</p>
        </AutomotiveEmptyPanel>
      ) : entries.length === 0 ? (
        <AutomotiveEmptyPanel>Keine Treffer für diese Suche / Filter.</AutomotiveEmptyPanel>
      ) : (
        <AutomotiveList aria-label="Umbauten und Einträge">
          {entries.map((doc) => (
            <ManualEntryRow
              key={doc.id}
              doc={doc}
              href={documentDetailHref(tagUuid, doc.id, surfaceScope)}
              isUmbau={isUmbau}
            />
          ))}
        </AutomotiveList>
      )}
    </section>
  );
}
