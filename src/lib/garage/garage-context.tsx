"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  rememberActiveGarageTagAction,
  refreshUserGarageAction,
} from "@/actions/garage";

import { garageSwitchPath } from "./garage-switch-path";
import type { GarageVehicle } from "./types";

type GarageContextValue = {
  userVehicles: GarageVehicle[];
  activeVehicleId: string | null;
  routeTagUuid: string;
  isLoading: boolean;
  error: string | null;
  refreshGarage: () => Promise<void>;
  switchVehicle: (vehicleId: string) => Promise<void>;
};

const GarageContext = createContext<GarageContextValue | null>(null);

export function GarageProvider({
  children,
  initialGarage,
  initialActiveVehicleId,
  routeTagUuid,
}: {
  children: ReactNode;
  initialGarage: GarageVehicle[];
  initialActiveVehicleId: string | null;
  routeTagUuid: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  const [userVehicles, setUserVehicles] = useState(initialGarage);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(
    initialActiveVehicleId ??
      initialGarage[0]?.vehicleId ??
      null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUserVehicles(initialGarage);
  }, [initialGarage]);

  useEffect(() => {
    const fromRoute = userVehicles.find(
      (entry) => entry.tagUuid === routeTagUuid,
    )?.vehicleId;
    if (fromRoute) {
      setActiveVehicleId(fromRoute);
    }
  }, [routeTagUuid, userVehicles]);

  const refreshGarage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await refreshUserGarageAction();
      setUserVehicles(next);
      if (
        activeVehicleId &&
        !next.some((entry) => entry.vehicleId === activeVehicleId)
      ) {
        setActiveVehicleId(next[0]?.vehicleId ?? null);
      }
    } catch {
      setError("Garage konnte nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }, [activeVehicleId]);

  const switchVehicle = useCallback(
    async (vehicleId: string) => {
      const target = userVehicles.find((entry) => entry.vehicleId === vehicleId);
      if (!target || target.tagUuid === routeTagUuid) {
        setActiveVehicleId(vehicleId);
        return;
      }

      setError(null);
      const remembered = await rememberActiveGarageTagAction(target.tagUuid);
      if (!remembered.ok) {
        setError(remembered.message);
        return;
      }

      setActiveVehicleId(vehicleId);
      const nextPath = garageSwitchPath(
        pathname,
        search ? `?${search}` : "",
        routeTagUuid,
        target.tagUuid,
      );
      router.replace(nextPath);
    },
    [userVehicles, routeTagUuid, pathname, search, router],
  );

  const value = useMemo(
    () => ({
      userVehicles,
      activeVehicleId,
      routeTagUuid,
      isLoading,
      error,
      refreshGarage,
      switchVehicle,
    }),
    [
      userVehicles,
      activeVehicleId,
      routeTagUuid,
      isLoading,
      error,
      refreshGarage,
      switchVehicle,
    ],
  );

  return (
    <GarageContext.Provider value={value}>{children}</GarageContext.Provider>
  );
}

export function useGarage(): GarageContextValue {
  const ctx = useContext(GarageContext);
  if (!ctx) {
    throw new Error("useGarage must be used within GarageProvider");
  }
  return ctx;
}

export function useGarageOptional(): GarageContextValue | null {
  return useContext(GarageContext);
}
