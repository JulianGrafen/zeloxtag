import type { ReactNode } from "react";

import { AutomotivePageHeader } from "@/components/ui/automotive";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import { cn } from "@/lib/utils";

type VehicleSettingsSubpageShellProps = {
  tagUuid: string;
  /** When set, default back link uses garage or /v route correctly (not /v/vehicleId). */
  vehicleSurfaceScope?: VehicleSurfaceScope;
  title: string;
  description?: ReactNode;
  kicker?: string;
  meta?: string;
  backHref?: string;
  backLabel?: string;
  /** OLED discover / swipe — dark header tokens on black. */
  theme?: "default" | "discover";
  children: ReactNode;
};

export function VehicleSettingsSubpageShell({
  tagUuid,
  vehicleSurfaceScope,
  title,
  description,
  kicker,
  meta,
  backHref,
  backLabel = "Showcase",
  theme = "default",
  children,
}: VehicleSettingsSubpageShellProps) {
  const resolvedBackHref =
    backHref ??
    (vehicleSurfaceScope
      ? vehicleSurfaceHref(vehicleSurfaceScope, "einstellungen")
      : `/v/${tagUuid}/einstellungen`);

  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-lg flex-col px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5",
        theme === "discover" ? "dark gap-4" : "gap-5",
      )}
    >
      <AutomotivePageHeader
        kicker={kicker}
        title={title}
        meta={meta}
        description={description}
        backHref={resolvedBackHref}
        backLabel={backLabel}
      />
      {children}
    </section>
  );
}
