"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import {
  createPlatformServices,
  type PlatformServices,
} from "@/services/platform/create-platform-services";

const PlatformServicesContext = createContext<PlatformServices | null>(null);

export function PlatformServicesProvider({
  children,
  revenueCatUserId,
}: {
  children: ReactNode;
  /** Supabase user id — links native purchases to the account. */
  revenueCatUserId?: string | null;
}) {
  const services = useMemo(() => createPlatformServices(), []);

  useEffect(() => {
    const userId = revenueCatUserId?.trim();
    if (!userId || !services.platform.isNativeApp) {
      return;
    }
    void services.billing.identifyUser?.(userId);
  }, [revenueCatUserId, services]);

  return (
    <PlatformServicesContext.Provider value={services}>
      {children}
    </PlatformServicesContext.Provider>
  );
}

export function usePlatformServices(): PlatformServices {
  const context = useContext(PlatformServicesContext);
  if (!context) {
    throw new Error(
      "usePlatformServices must be used within PlatformServicesProvider",
    );
  }
  return context;
}
