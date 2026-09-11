import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/** Standalone settings row — same surface as Konto & Sicherheit. */
export const SETTINGS_SUBMENU_TILE_CLASS =
  "flex items-center justify-between gap-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-3.5 text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]";

export const SETTINGS_SUBMENU_GROUP_ROW_CLASS =
  "flex items-center justify-between gap-3 px-4 py-3.5 text-[color:var(--vd-text)] transition-colors hover:bg-black/[0.02] active:bg-black/[0.04]";

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
        <span className="block text-[0.88rem] font-medium">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block text-[0.78rem] text-[color:var(--vd-muted)]">
            {subtitle}
          </span>
        ) : null}
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)]"
        aria-hidden
      />
    </Link>
  );
}
