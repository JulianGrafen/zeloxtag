"use client";

import { Car, Pencil } from "lucide-react";
import Link from "next/link";

import { dashboardHeroShellClassName } from "./dashboard-menu-styles";
import { PressableButton } from "./Pressable";
import { cn } from "@/lib/utils";

interface VehicleDashboardHeaderProps {
  vehicleModel: string;
  vehicleDataHref?: string;
  statusLabel?: string;
  statusDetail?: string;
  tagCoupled?: boolean;
  onEditVehicleImage?: () => void;
}

function parseVehicleHeroLabel(vehicleModel: string): {
  name: string;
  year: string | null;
} {
  const parts = vehicleModel.split(" · ");
  if (parts.length >= 2) {
    const yearCandidate = parts[parts.length - 1]?.trim() ?? "";
    if (/^\d{4}$/.test(yearCandidate)) {
      return {
        name: parts.slice(0, -1).join(" · ").trim(),
        year: yearCandidate,
      };
    }
  }
  return { name: vehicleModel.trim(), year: null };
}

export function VehicleDashboardHeader({
  vehicleModel,
  vehicleDataHref,
  statusLabel = "Verbunden",
  statusDetail,
  tagCoupled = true,
  onEditVehicleImage,
}: VehicleDashboardHeaderProps) {
  const { name, year } = parseVehicleHeroLabel(vehicleModel);

  return (
    <header
      className={cn(
        dashboardHeroShellClassName,
        "vd-anim-header relative z-40 shrink-0",
      )}
      data-tour="dashboard-header"
    >
      <div
        className="flex min-h-[10.5rem] flex-col justify-center px-4 py-6 sm:min-h-[11rem] sm:px-5 sm:py-7"
      >
        <div className="flex justify-center" aria-hidden>
          <Car className="h-5 w-5 text-zinc-500" strokeWidth={1.5} />
        </div>

        {!tagCoupled ? (
          <p
            className="mt-2 text-center text-[0.68rem] font-medium leading-snug text-rose-400/90"
          >
            {statusLabel}
            {statusDetail ? ` · ${statusDetail}` : null}
          </p>
        ) : null}

        <div className="mt-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1
              className="font-[family-name:var(--font-display)] text-[1.35rem] font-bold leading-tight tracking-tight text-white sm:text-[1.45rem]"
            >
              {name}
            </h1>
            <p
              className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.8rem] text-zinc-400"
            >
              {year ? (
                <span className="tabular-nums">{year}</span>
              ) : null}
              {vehicleDataHref ? (
                <Link
                  href={vehicleDataHref}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
                  aria-label="Fahrzeugdaten bearbeiten"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </Link>
              ) : null}
            </p>
          </div>

          {onEditVehicleImage ? (
            <PressableButton
              type="button"
              variant="button"
              onClick={onEditVehicleImage}
              aria-label="Fahrzeugfoto ändern"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-800/90 text-zinc-100 transition hover:bg-zinc-700/90"
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </PressableButton>
          ) : null}
        </div>
      </div>
    </header>
  );
}
