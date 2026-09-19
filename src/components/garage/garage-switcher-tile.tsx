"use client";

import { DashboardTile } from "@/components/vehicle-dashboard/DashboardTile";

import {
  GarageSwitcherModalHost,
  useGarageSwitcher,
} from "./garage-switcher-control";

/**
 * Dashboard tile — visible only when the owner has more than one vehicle.
 */
export function GarageSwitcherTile() {
  const { canSwitch, garage, open, setOpen } = useGarageSwitcher();

  if (!canSwitch || !garage) {
    return null;
  }

  const count = garage.userVehicles.length;

  return (
    <>
      <DashboardTile
        tile={{
          id: "garage",
          title: "Meine Garage",
          icon: "grid",
          tone: "default",
          meta: {
            subtitle: `${count} Fahrzeuge in der Garage`,
          },
        }}
        onClick={() => setOpen(true)}
      />
      <GarageSwitcherModalHost open={open} onClose={() => setOpen(false)} />
    </>
  );
}
