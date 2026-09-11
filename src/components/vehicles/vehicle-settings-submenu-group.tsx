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
      className={`overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)] divide-y divide-[color:var(--vd-border)] ${className}`.trim()}
    >
      {children}
    </div>
  );
}
