"use client";

import { motion } from "framer-motion";
import { Camera } from "lucide-react";

import { VehicleSilhouette } from "@/components/vehicle-dashboard/VehicleSilhouette";

type AnimatedVehicleHeaderProps = {
  /** Transparent PNG (or catalog cutout). Null → SVG fallback. */
  silhouetteImageUrl?: string | null;
  alt: string;
  className?: string;
  /** Owner can tap the cutout to replace / upload a side photo. */
  onEdit?: () => void;
  editLabel?: string;
};

const SPRING = {
  type: "spring" as const,
  stiffness: 100,
  damping: 15,
};

/**
 * Dashboard roll-in: car enters from the right with a spring stop.
 * Falls back to the generic SVG silhouette when no URL is set.
 */
export function AnimatedVehicleHeader({
  silhouetteImageUrl,
  alt,
  className = "",
  onEdit,
  editLabel = "Fahrzeugbild ändern",
}: AnimatedVehicleHeaderProps) {
  const src = silhouetteImageUrl?.trim() || null;
  const editable = typeof onEdit === "function";

  const stage = (
    <motion.div
      className="relative h-[4.75rem] w-full sm:h-28"
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={SPRING}
    >
      {src ? (
        // Same-origin (catalog or /api/vehicle/silhouette/…) — COEP-safe.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-contain object-right drop-shadow-[0_10px_18px_rgba(0,0,0,0.18)]"
        />
      ) : (
        <VehicleSilhouette
          label={alt}
          className="h-full w-full text-[color:var(--vd-accent)]"
        />
      )}

      {editable ? (
        <span
          aria-hidden
          className="absolute bottom-0 right-0 z-[2] inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
        >
          <Camera className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </motion.div>
  );

  return (
    <div
      className={`relative flex w-32 shrink-0 items-end justify-end overflow-visible md:w-48 ${className}`.trim()}
    >
      {editable ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={editLabel}
          title={editLabel}
          className="relative w-full rounded-xl outline-none transition active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-neutral-900/30"
        >
          {stage}
        </button>
      ) : (
        stage
      )}
    </div>
  );
}
