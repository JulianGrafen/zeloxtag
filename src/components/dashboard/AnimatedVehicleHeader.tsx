"use client";

import Image from "next/image";
import { motion } from "framer-motion";

import { VehicleSilhouette } from "@/components/vehicle-dashboard/VehicleSilhouette";

type AnimatedVehicleHeaderProps = {
  /** Transparent PNG (or catalog cutout). Null → SVG fallback. */
  silhouetteImageUrl?: string | null;
  alt: string;
  className?: string;
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
}: AnimatedVehicleHeaderProps) {
  const src = silhouetteImageUrl?.trim() || null;

  return (
    <div
      className={`relative flex w-32 shrink-0 items-end justify-end overflow-hidden md:w-48 ${className}`.trim()}
    >
      <motion.div
        className="relative h-[4.75rem] w-full sm:h-28"
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={SPRING}
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            priority
            sizes="(max-width: 768px) 8rem, 12rem"
            className="object-contain object-right drop-shadow-[0_10px_18px_rgba(0,0,0,0.18)]"
            unoptimized={src.startsWith("data:") || src.includes("supabase.co")}
          />
        ) : (
          <VehicleSilhouette
            label={alt}
            className="h-full w-full text-[color:var(--vd-accent)]"
          />
        )}
      </motion.div>
    </div>
  );
}
