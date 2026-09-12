"use client";

import { motion } from "framer-motion";

import { formatPublicVehicleTitle } from "@/lib/vehicles/format-public-vehicle-title";

import { useClaimMotion } from "./claim-motion";

type ClaimTwinPreviewCardProps = {
  make: string;
  model: string;
  year: string;
};

export function ClaimTwinPreviewCard({
  make,
  model,
  year,
}: ClaimTwinPreviewCardProps) {
  const motionConfig = useClaimMotion();
  const title = formatPublicVehicleTitle(make.trim(), model.trim());
  const hasTitle = Boolean(title);
  const yearLabel = year.trim() ? year.trim() : null;

  if (!hasTitle && !yearLabel) {
    return null;
  }

  const displayTitle = hasTitle ? title : "Dein Fahrzeug";

  return (
    <motion.div
      className="claim-twin-preview"
      initial={motionConfig.reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="claim-twin-preview__kicker">So sehen andere dein Auto</p>
      <div className="claim-twin-preview__card">
        <div
          className="claim-twin-preview__silhouette"
          aria-hidden
        />
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
    </motion.div>
  );
}
