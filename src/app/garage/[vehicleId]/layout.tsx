import { Suspense } from "react";

import { getCurrentUser } from "@/lib/auth/get-user";
import { fetchUserGarage } from "@/lib/garage/fetch-user-garage";
import { GarageTagCouplingStatusHost } from "@/components/garage/garage-tag-coupling-status";
import { GarageProvider } from "@/lib/garage/garage-context";
import { createClient } from "@/lib/supabase/server";

interface GarageVehicleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ vehicleId: string }>;
}

export default async function GarageVehicleLayout({
  children,
  params,
}: GarageVehicleLayoutProps) {
  const { vehicleId: rawVehicleId } = await params;
  const vehicleId = rawVehicleId.trim();
  const user = await getCurrentUser();

  if (!user) {
    return children;
  }

  const supabase = await createClient();
  const garage = await fetchUserGarage(supabase);

  if (garage.length === 0) {
    return children;
  }

  const entry =
    garage.find((row) => row.vehicleId === vehicleId) ?? garage[0] ?? null;

  const routeScope = {
    vehicleId: entry?.vehicleId ?? vehicleId,
    linkedTagUuid: entry?.tagUuid ?? null,
  };

  return (
    <Suspense fallback={children}>
      <GarageProvider
        initialGarage={garage}
        initialActiveVehicleId={routeScope.vehicleId}
        routeScope={routeScope}
      >
        <GarageTagCouplingStatusHost />
        {children}
      </GarageProvider>
    </Suspense>
  );
}
