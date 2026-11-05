import type { ReactNode } from "react";

import { IOSListPage } from "@/components/ui/ios";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

type VehicleSettingsSubpageShellProps = {
  tagUuid: string;
  /** When set, default back link uses garage or /v route correctly (not /v/vehicleId). */
  vehicleSurfaceScope?: VehicleSurfaceScope;
  title: string;
  description?: ReactNode;
  /** @deprecated Kicker/meta collapsed into the subtitle for one consistent header. */
  kicker?: string;
  meta?: string;
  backHref?: string;
  backLabel?: string;
  /** @deprecated Every subpage now uses the same OLED inset-grouped page. */
  theme?: "default" | "discover";
  children: ReactNode;
  /** Portaled FAB / bottom chrome (rendered outside the scroll column). */
  fixedAction?: ReactNode;
};

/**
 * Shared frame for every „Mein Fahrzeug“ subpage (Soundcheck, Galerie, Exposé,
 * Leistungsdiagramm, …): same large-title header, back link and spacing as the
 * hub and the dashboard lists.
 */
export function VehicleSettingsSubpageShell({
  tagUuid,
  vehicleSurfaceScope,
  title,
  description,
  meta,
  backHref,
  backLabel = "Mein Fahrzeug",
  children,
  fixedAction,
}: VehicleSettingsSubpageShellProps) {
  const resolvedBackHref =
    backHref ??
    (vehicleSurfaceScope
      ? vehicleSurfaceHref(vehicleSurfaceScope, "einstellungen")
      : `/v/${tagUuid}/einstellungen`);

  return (
    <IOSListPage
      title={title}
      subtitle={meta ?? description}
      backHref={resolvedBackHref}
      backLabel={backLabel}
      overlay={fixedAction}
    >
      {children}
    </IOSListPage>
  );
}
