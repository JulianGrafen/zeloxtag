"use client";

import { DashboardScanFab } from "@/components/tags/dashboard-scan-fab";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

type UmbautenSettingsScanFabProps = {
  tagUuid: string;
  vehicleSurfaceScope?: VehicleSurfaceScope;
};

/** Plus-FAB for Chronik & Rechnungen (portaled; must be a client leaf). */
export function UmbautenSettingsScanFab({
  tagUuid,
  vehicleSurfaceScope,
}: UmbautenSettingsScanFabProps) {
  const umbautenHref = vehicleSurfaceScope
    ? `${vehicleSurfaceHref(vehicleSurfaceScope, "umbauten")}?neu=1`
    : `/v/${tagUuid}/umbauten?neu=1`;
  const scanHref = vehicleSurfaceScope
    ? `${vehicleSurfaceHref(vehicleSurfaceScope, "?scan=1&type=invoice")}`
    : `/v/${tagUuid}?scan=1&type=invoice`;

  return (
    <DashboardScanFab
      tagUuid={tagUuid}
      directAction="menu"
      menuTitle="Umbau hinzufügen"
      hideFuelAction
      scanHref={scanHref}
      scanActionLabel="Rechnung scannen"
      manualEntryHref={umbautenHref}
      manualActionLabel="Umbau mit Foto"
      manualActionDescription="Manuell mit Foto — ideal für die Chronik"
    />
  );
}
