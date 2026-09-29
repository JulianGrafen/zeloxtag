"use client";

import { motion } from "framer-motion";

import { formatPublicVehicleTitle } from "@/lib/vehicles/format-public-vehicle-title";
import {
  buildPersonalityLabelForId,
  type BuildPersonalityChipId,
} from "@/lib/vehicles/build-personality-chips";

import { useClaimMotion } from "./claim-motion";

type ClaimTwinPreviewCardProps = {
  make: string;
  model: string;
  year: string;
  personalityTags: readonly BuildPersonalityChipId[];
  photoPreviewUrl?: string | null;
};

export function ClaimTwinPreviewCard({
  make,
  model,
  year,
  personalityTags,
  photoPreviewUrl = null,
}: ClaimTwinPreviewCardProps) {
  const motionConfig = useClaimMotion();
  const title = formatPublicVehicleTitle(make.trim(), model.trim());
  const hasTitle = Boolean(title);
  const yearLabel = year.trim() ? year.trim() : null;
  const hasPhoto = Boolean(photoPreviewUrl?.trim());

  if (!hasTitle && !yearLabel && !hasPhoto) {
    return null;
  }

  const displayTitle = hasTitle ? title : "Dein Fahrzeug";
  const previewLabels = personalityTags
    .map((id) => buildPersonalityLabelForId(id))
    .filter((label): label is string => Boolean(label));

  return (
    <motion.div
      className="claim-twin-preview"
      initial={motionConfig.reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="claim-twin-preview__kicker">So sehen andere dein Fahrzeug</p>
      <div
        className={
          hasPhoto
            ? "claim-twin-preview__card claim-twin-preview__card--with-photo"
            : "claim-twin-preview__card"
        }
      >
        {hasPhoto ? (
          <div className="claim-twin-preview__photo-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreviewUrl!}
              alt="Dein Fahrzeugfoto"
              className="claim-twin-preview__photo"
            />
          </div>
        ) : (
          <div className="claim-twin-preview__silhouette" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.95rem] font-semibold text-[color:var(--vd-text)]">
            {displayTitle}
          </p>
          {yearLabel ? (
            <p className="mt-0.5 text-[0.78rem] text-[color:var(--vd-muted)]">
              Baujahr {yearLabel}
            </p>
          ) : null}
        </div>
      </div>

      {previewLabels.length > 0 ? (
        <ul
          className="claim-twin-preview__chips flex flex-wrap gap-1.5"
          aria-label="Gewählte Build-Vibes"
        >
          {previewLabels.map((label) => (
            <li key={label}>
              <span className="inline-block rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-2.5 py-0.5 text-[0.68rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]">
                {label}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </motion.div>
  );
}
