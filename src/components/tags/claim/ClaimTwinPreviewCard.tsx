"use client";

import { motion } from "framer-motion";

import { formatPublicVehicleTitle } from "@/lib/vehicles/format-public-vehicle-title";
import {
  buildPersonalityLabelForId,
  type BuildPersonalityChipId,
} from "@/lib/vehicles/build-personality-chips";
import { buildClaimPreviewQuartettLines } from "@/lib/tags/claim-preview-quartett";

import { ClaimPreviewQuartettBar } from "./ClaimPreviewQuartettBar";
import { useClaimMotion } from "./claim-motion";

type ClaimTwinPreviewCardProps = {
  make: string;
  model: string;
  year: string;
  powerPs?: string;
  torqueNm?: string;
  displacementCc?: string;
  accel0To100Sec?: string;
  accel100To200Sec?: string;
  drivetrain?: string;
  fuelType?: string;
  personalityTags: readonly BuildPersonalityChipId[];
  photoPreviewUrl?: string | null;
};

export function ClaimTwinPreviewCard({
  make,
  model,
  year,
  powerPs = "",
  torqueNm = "",
  displacementCc = "",
  accel0To100Sec = "",
  accel100To200Sec = "",
  drivetrain = "",
  fuelType = "",
  personalityTags,
  photoPreviewUrl = null,
}: ClaimTwinPreviewCardProps) {
  const motionConfig = useClaimMotion();
  const title = formatPublicVehicleTitle(make.trim(), model.trim());
  const hasTitle = Boolean(title);
  const yearLabel = year.trim() ? year.trim() : null;
  const hasPhoto = Boolean(photoPreviewUrl?.trim());
  const quartettLines = buildClaimPreviewQuartettLines({
    powerPs,
    torqueNm,
    displacementCc,
    accel0To100Sec,
    accel100To200Sec,
  });
  const metaParts = [
    yearLabel ? `Baujahr ${yearLabel}` : null,
    drivetrain.trim() || null,
    fuelType.trim() || null,
  ].filter(Boolean);

  if (!hasTitle && !yearLabel && !hasPhoto && quartettLines.length === 0) {
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
      <p className="claim-twin-preview__kicker">Deine Quartett-Karte entsteht</p>
      <div
        className={
          hasPhoto
            ? "claim-twin-preview__card claim-twin-preview__card--with-photo claim-twin-preview__card--quartett"
            : "claim-twin-preview__card claim-twin-preview__card--quartett"
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
          {metaParts.length > 0 ? (
            <p className="mt-0.5 text-[0.78rem] text-[color:var(--vd-muted)]">
              {metaParts.join(" · ")}
            </p>
          ) : null}

          {quartettLines.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2.5" aria-label="Fahrzeugwerte">
              {quartettLines.map((line) => (
                <motion.li
                  key={line.key}
                  className="space-y-1"
                  initial={
                    motionConfig.reduceMotion
                      ? false
                      : { opacity: 0, y: 6 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex items-baseline justify-between gap-2 text-[0.72rem]">
                    <span className="text-[color:var(--vd-muted)]">
                      {line.label}
                    </span>
                    <span className="font-medium tabular-nums text-[color:var(--vd-text)]">
                      {line.value}
                    </span>
                  </div>
                  <ClaimPreviewQuartettBar filled={line.filled} />
                </motion.li>
              ))}
            </ul>
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
