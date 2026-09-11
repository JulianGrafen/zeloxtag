import Link from "next/link";
import { ChevronRight } from "lucide-react";

type VehicleSettingsSubmenuLinkProps = {
  href: string;
  title: string;
  subtitle: string;
  /** Align with parent card padding when submenu has no own surface frame. */
  flush?: boolean;
};

export function VehicleSettingsSubmenuLink({
  href,
  title,
  subtitle,
  flush = false,
}: VehicleSettingsSubmenuLinkProps) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-3 py-3.5 text-[color:var(--vd-text)] ${
        flush ? "px-0" : "px-4 sm:px-5"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-[0.88rem] font-medium">{title}</span>
        <span className="mt-0.5 block text-[0.78rem] text-[color:var(--vd-muted)]">
          {subtitle}
        </span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)]"
        aria-hidden
      />
    </Link>
  );
}
