"use client";

import { AnimatedVehicleHeader } from "@/components/dashboard/AnimatedVehicleHeader";
import { isOwnerSilhouetteSrc } from "@/lib/vehicles/silhouette-display-url";

interface VehicleDashboardHeaderProps {
  ownerName: string;
  vehicleModel: string;
  vehicleImage?: string;
  vehicleImageFallback?: string;
  vehicleImagePreviewFallback?: string;
  vehicleImageAlt?: string;
  vehicleImageFrameless?: boolean;
  statusLabel?: string;
  onEditVehicleImage?: () => void;
  onSilhouetteProxyLoad?: () => void;
}

export function VehicleDashboardHeader({
  ownerName,
  vehicleModel,
  vehicleImage,
  vehicleImageFallback,
  vehicleImagePreviewFallback,
  vehicleImageAlt,
  vehicleImageFrameless = false,
  statusLabel = "ZeloxTag · Verbunden",
  onEditVehicleImage,
  onSilhouetteProxyLoad,
}: VehicleDashboardHeaderProps) {
  const greeting = `${ownerName}s ${vehicleModel}`;

  return (
    <header className="vd-surface-card relative overflow-hidden p-5 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--vd-glow)_0%,transparent_55%),radial-gradient(ellipse_at_bottom_left,var(--vd-glow-soft)_0%,transparent_50%)]"
      />

      <div className="relative flex items-center justify-between gap-3 sm:gap-5">
        <div className="min-w-0 flex-1 space-y-2.5">
          <p className="claim-kicker flex items-center gap-1.5">
            <span>{statusLabel}</span>
            <span className="vd-connected-dot" aria-label="Verbunden" />
          </p>
          <div className="space-y-1">
            <h1 className="font-[family-name:var(--font-display)] text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.035em] text-[color:var(--vd-text)] sm:text-[1.9rem]">
              Willkommen!
            </h1>
            <p className="font-[family-name:var(--font-display)] text-[1.15rem] font-semibold leading-snug tracking-[-0.03em] text-[color:var(--vd-accent)] sm:text-[1.4rem]">
              {ownerName}s {vehicleModel}
            </p>
          </div>
        </div>

        <AnimatedVehicleHeader
          silhouetteImageUrl={vehicleImage}
          previewFallbackUrl={vehicleImagePreviewFallback}
          fallbackImageUrl={vehicleImageFallback}
          lockOwnerSilhouette={isOwnerSilhouetteSrc(vehicleImage)}
          frameless={vehicleImageFrameless}
          alt={vehicleImageAlt ?? greeting}
          onEdit={onEditVehicleImage}
          onPrimaryLoad={onSilhouetteProxyLoad}
        />
      </div>
    </header>
  );
}
