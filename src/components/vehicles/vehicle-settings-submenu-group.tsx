import type { ReactNode } from "react";

type VehicleSettingsSubmenuGroupProps = {
  children: ReactNode;
  className?: string;
};

/** iOS-style inset group for multiple settings rows. */
export function VehicleSettingsSubmenuGroup({
  children,
  className = "",
}: VehicleSettingsSubmenuGroupProps) {
  return (
    <div
      className={`zt-feature-panel overflow-hidden shadow-[var(--vd-shadow-sm)] divide-y divide-[color:var(--vd-border)] ${className}`.trim()}
    >
      {children}
    </div>
  );
}
