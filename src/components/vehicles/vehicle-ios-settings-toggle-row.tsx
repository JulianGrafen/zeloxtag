"use client";

import { IOSListItem, IOSSwitch } from "@/components/ui/ios";

type VehicleIosSettingsToggleRowProps = {
  label: string;
  sublabel?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
  isLast?: boolean;
};

export function VehicleIosSettingsToggleRow({
  label,
  sublabel,
  checked,
  onCheckedChange,
  disabled = false,
  isLast = false,
}: VehicleIosSettingsToggleRowProps) {
  return (
    <IOSListItem
      label={label}
      sublabel={sublabel}
      isLast={isLast}
      showChevron={false}
      disabled={disabled}
      trailing={
        <IOSSwitch
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          ariaLabel={label}
        />
      }
    />
  );
}
