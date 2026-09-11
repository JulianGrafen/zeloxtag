import type { ReactNode } from "react";

type VehicleSettingsSubmenuSectionProps = {
  children: ReactNode;
  className?: string;
};

/** Header + links block without an extra surface card (avoids nested white frames). */
export function VehicleSettingsSubmenuSection({
  children,
  className = "",
}: VehicleSettingsSubmenuSectionProps) {
  return (
    <section className={`overflow-hidden ${className}`.trim()}>{children}</section>
  );
}
