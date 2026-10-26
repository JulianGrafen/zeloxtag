"use client";

import {
  IOS_ROW_SEPARATOR,
  IOS_ROW_SEPARATOR_INSET_TEXT,
  IOSListItem,
} from "@/components/ui/ios";
import { cn } from "@/lib/utils";

type VehicleSettingsSubmenuLinkProps = {
  href: string;
  title: string;
  subtitle?: string;
  tour?: string;
  /** @deprecated IOS rows ignore variant; kept for call-site compatibility. */
  variant?: "tile" | "group";
  isLast?: boolean;
};

/** The `data-tour` wrapper is the card's direct child, so it draws the hairline instead of the row. */
export function VehicleSettingsSubmenuLink({
  href,
  title,
  subtitle,
  tour,
  isLast = false,
}: VehicleSettingsSubmenuLinkProps) {
  return (
    <div
      data-tour={tour}
      className={cn(
        "relative",
        IOS_ROW_SEPARATOR,
        IOS_ROW_SEPARATOR_INSET_TEXT,
        isLast && "after:hidden",
      )}
    >
      <IOSListItem
        label={title}
        sublabel={subtitle}
        href={href}
        isLast
        showChevron
      />
    </div>
  );
}
