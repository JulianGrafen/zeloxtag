"use client";

import { VehicleDashboard } from "@/components/vehicle-dashboard";
import { demoVehicle } from "@/lib/demoVehicle";

export default function Home() {
  return (
    <VehicleDashboard
      data={demoVehicle}
      onTileClick={(tileId) => {
        console.log("Kachel öffnen:", tileId);
      }}
    />
  );
}
