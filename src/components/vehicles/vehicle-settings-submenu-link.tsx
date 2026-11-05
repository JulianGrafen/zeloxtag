"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  IOS_ROW_SEPARATOR,
  IOS_ROW_SEPARATOR_INSET_ICON,
  IOS_ROW_SEPARATOR_INSET_TEXT,
  InsetListRow,
  type IconBadgeTone,
} from "@/components/ui/ios";
import { cn } from "@/lib/utils";

type VehicleSettingsSubmenuLinkProps = {
  href: string;
  title: string;
  subtitle?: string;
  /** Short status on the right (e.g. „Aktiv“, „3/10“). */
  value?: ReactNode;
  icon?: LucideIcon;
  iconTone?: IconBadgeTone;
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
  value,
  icon,
  iconTone = "neutral",
  tour,
  isLast = false,
}: VehicleSettingsSubmenuLinkProps) {
  return (
    <div
      data-tour={tour}
      className={cn(
        "relative",
        IOS_ROW_SEPARATOR,
        icon ? IOS_ROW_SEPARATOR_INSET_ICON : IOS_ROW_SEPARATOR_INSET_TEXT,
        isLast && "after:hidden",
      )}
    >
      <InsetListRow
        emphasis="navigation"
        label={title}
        sublabel={subtitle}
        value={value}
        icon={icon}
        iconTone={iconTone}
        href={href}
        chevron
        isLast
      />
    </div>
  );
}
