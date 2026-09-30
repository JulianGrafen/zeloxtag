import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

type VehicleSettingsSubpageShellProps = {
  tagUuid: string;
  /** When set, default back link uses garage or /v route correctly (not /v/vehicleId). */
  vehicleSurfaceScope?: VehicleSurfaceScope;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
};

export function VehicleSettingsSubpageShell({
  tagUuid,
  vehicleSurfaceScope,
  title,
  description,
  backHref,
  backLabel = "Showcase",
  children,
}: VehicleSettingsSubpageShellProps) {
  const resolvedBackHref =
    backHref ??
    (vehicleSurfaceScope
      ? vehicleSurfaceHref(vehicleSurfaceScope, "einstellungen")
      : `/v/${tagUuid}/einstellungen`);

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
      <Link
        href={resolvedBackHref}
        className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {backLabel}
      </Link>

      <header className="space-y-1">
        <h1 className="font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
          {title}
        </h1>
        {description ? (
          <p className="text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
            {description}
          </p>
        ) : null}
      </header>

      {children}
    </section>
  );
}
