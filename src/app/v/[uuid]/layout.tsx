import { Suspense } from "react";

import { getCurrentUser } from "@/lib/auth/get-user";
import { fetchUserGarage } from "@/lib/garage/fetch-user-garage";
import { GarageProvider } from "@/lib/garage/garage-context";
import { createClient } from "@/lib/supabase/server";

interface VehicleTagLayoutProps {
  children: React.ReactNode;
  params: Promise<{ uuid: string }>;
}

export default async function VehicleTagLayout({
  children,
  params,
}: VehicleTagLayoutProps) {
  const { uuid } = await params;
  const routeTagUuid = uuid.trim();
  const user = await getCurrentUser();

  if (!user) {
    return children;
  }

  const supabase = await createClient();
  const garage = await fetchUserGarage(supabase);

  if (garage.length === 0) {
    return children;
  }

  const activeVehicleId =
    garage.find((entry) => entry.tagUuid === routeTagUuid)?.vehicleId ??
    garage[0]?.vehicleId ??
    null;

  return (
    <Suspense fallback={children}>
      <GarageProvider
        initialGarage={garage}
        initialActiveVehicleId={activeVehicleId}
        routeTagUuid={routeTagUuid}
      >
        {children}
      </GarageProvider>
    </Suspense>
  );
}
