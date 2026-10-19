"use client";

import { IOSListItem } from "@/components/ui/ios";

type VehicleSettingsSubmenuLinkProps = {
  href: string;
  title: string;
  subtitle?: string;
  tour?: string;
  /** @deprecated IOS rows ignore variant; kept for call-site compatibility. */
  variant?: "tile" | "group";
  isLast?: boolean;
};

export function VehicleSettingsSubmenuLink({
  href,
  title,
  subtitle,
  tour,
  isLast = false,
}: VehicleSettingsSubmenuLinkProps) {
  return (
    <div data-tour={tour}>
      <IOSListItem
        label={title}
        sublabel={subtitle}
        href={href}
        isLast={isLast}
        showChevron
      />
    </div>
  );
}
