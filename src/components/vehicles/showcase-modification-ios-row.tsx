"use client";

import { ChevronRight, ImageIcon } from "lucide-react";

import { IOSSwitch } from "@/components/ui/ios";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { formatCompactGermanDate } from "@/lib/documents/format";
import { documentMediaKind } from "@/lib/documents/viewable-url";
import { ownerShowcaseFileApiPath } from "@/lib/share/share-card-owner-showcase-file-url";
import { isBuildStoryEligibleDocument } from "@/lib/vehicles/build-story-document";
import { formatShowcaseDocumentLabel } from "@/lib/vehicles/public-showcase-documents";
import type { Document } from "@/types/database";

type ShowcaseModificationIosRowProps = {
  doc: Document;
  vehicleId: string;
  editHref: string;
  showcaseChecked: boolean;
  chronikChecked: boolean;
  disabled?: boolean;
  isLast?: boolean;
  onToggleShowcase: (value: boolean) => void;
  onToggleChronik: (value: boolean) => void;
};

function modificationThumbSrc(
  vehicleId: string,
  doc: Document,
): string | null {
  const fileUrl = doc.file_url?.trim();
  if (!fileUrl || documentMediaKind(fileUrl) !== "image") return null;
  return ownerShowcaseFileApiPath(vehicleId, fileUrl, 256);
}

function formatModificationMeta(doc: Document): string {
  const parts: string[] = [];
  if (doc.date) parts.push(formatCompactGermanDate(doc.date));
  if (doc.mileage_km != null) {
    parts.push(`${doc.mileage_km.toLocaleString("de-DE")} km`);
  }
  return parts.join(" · ");
}

export function ShowcaseModificationIosRow({
  doc,
  vehicleId,
  editHref,
  showcaseChecked,
  chronikChecked,
  disabled = false,
  isLast = false,
  onToggleShowcase,
  onToggleChronik,
}: ShowcaseModificationIosRowProps) {
  const thumbSrc = modificationThumbSrc(vehicleId, doc);
  const chronikEligible = isBuildStoryEligibleDocument(doc);
  const meta = formatModificationMeta(doc);

  return (
    <div className={isLast ? "" : "border-b border-white/10"}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
          {thumbSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbSrc}
              alt=""
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-zinc-500">
              <ImageIcon className="h-5 w-5" aria-hidden />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-white">
            {formatShowcaseDocumentLabel(doc)}
          </p>
          {meta ? (
            <p className="mt-0.5 truncate text-[13px] text-zinc-400">{meta}</p>
          ) : null}
        </div>
        <PressableLink
          href={editHref}
          variant="row"
          className="inline-flex shrink-0 items-center gap-0.5 px-1 py-2 text-[13px] font-medium text-[#0A84FF]"
          aria-label="Umbau bearbeiten"
        >
          Bearbeiten
          <ChevronRight className="h-4 w-4" aria-hidden />
        </PressableLink>
      </div>
      <div className="pb-1">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="min-w-0">
            <p className="text-[14px] text-white">Im Showcase</p>
            <p className="text-[12px] text-zinc-500">Umbau-Liste im Profil</p>
          </div>
          <IOSSwitch
            checked={showcaseChecked}
            onCheckedChange={onToggleShowcase}
            disabled={disabled}
            ariaLabel="Im Showcase"
          />
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="min-w-0">
            <p className="text-[14px] text-white">In Chronik</p>
            <p className="text-[12px] text-zinc-500">
              {chronikEligible ? "Build-Story Timeline" : "Foto nötig"}
            </p>
          </div>
          <IOSSwitch
            checked={chronikChecked}
            onCheckedChange={onToggleChronik}
            disabled={disabled || !chronikEligible}
            ariaLabel="In Chronik"
          />
        </div>
      </div>
    </div>
  );
}
