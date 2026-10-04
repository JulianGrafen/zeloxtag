import Link from "next/link";
import { ChevronRight } from "lucide-react";

import {
  automotiveCardClassName,
  automotiveCardTitleClassName,
  automotiveMetaClassName,
} from "@/components/ui/automotive";
import { cn } from "@/lib/utils";

/** Standalone settings row — automotive material surface in dark. */
export const SETTINGS_SUBMENU_TILE_CLASS = cn(
  automotiveCardClassName,
  "flex items-center justify-between gap-3 px-4 py-3.5 transition-[border-color,box-shadow] duration-200 hover:border-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]",
);

export const SETTINGS_SUBMENU_GROUP_ROW_CLASS =
  "flex items-center justify-between gap-3 px-4 py-3.5 text-zinc-100 transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]";

type VehicleSettingsSubmenuLinkProps = {
  href: string;
  title: string;
  subtitle?: string;
  tour?: string;
  variant?: "tile" | "group";
};

export function VehicleSettingsSubmenuLink({
  href,
  title,
  subtitle,
  tour,
  variant = "tile",
}: VehicleSettingsSubmenuLinkProps) {
  return (
    <Link
      href={href}
      data-tour={tour}
      className={cn(
        variant === "group"
          ? SETTINGS_SUBMENU_GROUP_ROW_CLASS
          : SETTINGS_SUBMENU_TILE_CLASS,
      )}
    >
      <span className="min-w-0">
        <span className={cn("block", automotiveCardTitleClassName)}>{title}</span>
        {subtitle ? (
          <span className={cn("mt-0.5 block", automotiveMetaClassName)}>
            {subtitle}
          </span>
        ) : null}
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-zinc-500"
        aria-hidden
      />
    </Link>
  );
}
