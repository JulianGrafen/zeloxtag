"use client";

import { useState } from "react";

import { VehicleSilhouette } from "@/components/vehicle-dashboard/VehicleSilhouette";
import { cn } from "@/lib/utils";

interface GarageVehicleThumbnailProps {
  imageSrc?: string;
  imageAlt: string;
  className?: string;
}

export function GarageVehicleThumbnail({
  imageSrc,
  imageAlt,
  className,
}: GarageVehicleThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(imageSrc?.trim()) && !failed;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-muted)]",
        className,
      )}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- same-origin silhouette proxy
        <img
          src={imageSrc}
          alt={imageAlt}
          className="h-full w-full object-contain object-center"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <VehicleSilhouette className="h-[70%] w-[88%] opacity-80" label={imageAlt} />
      )}
    </span>
  );
}
