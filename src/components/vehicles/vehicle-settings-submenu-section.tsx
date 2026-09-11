import type { ReactNode } from "react";

type VehicleSettingsSubmenuSectionProps = {
  children: ReactNode;
  className?: string;
};

/** Label + submenu tiles. Tiles carry their own surface; this wrapper does not. */
export function VehicleSettingsSubmenuSection({
  children,
  className = "",
}: VehicleSettingsSubmenuSectionProps) {
  return (
    <section className={`flex flex-col gap-2 ${className}`.trim()}>
      {children}
    </section>
  );
}
