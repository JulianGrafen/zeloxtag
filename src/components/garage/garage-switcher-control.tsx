"use client";

import { useState } from "react";

import { useGarageOptional } from "@/lib/garage/use-garage";

import { GarageSwitcherModal } from "./garage-switcher-modal";

export function useGarageSwitcher() {
  const garage = useGarageOptional();
  const [open, setOpen] = useState(false);

  const active =
    garage?.userVehicles.find(
      (entry) => entry.vehicleId === garage.activeVehicleId,
    ) ?? garage?.userVehicles[0];

  return {
    garage,
    open,
    setOpen,
    active,
    canSwitch: Boolean(garage && garage.userVehicles.length > 1),
  };
}

export function GarageSwitcherModalHost({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const garage = useGarageOptional();
  if (!garage || garage.userVehicles.length <= 1) return null;

  return (
    <GarageSwitcherModal
      open={open}
      vehicles={garage.userVehicles}
      activeVehicleId={garage.activeVehicleId}
      onClose={onClose}
      onSelect={async (vehicleId) => {
        await garage.switchVehicle(vehicleId);
        onClose();
      }}
    />
  );
}
