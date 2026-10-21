import { cn } from "@/lib/utils";

import { showroomModVendorTypography } from "./showroom-mod-typography";

type ModBadgeProps = {
  children: string;
  className?: string;
};

export function ModBadge({ children, className }: ModBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5",
        showroomModVendorTypography(children),
        className,
      )}
    >
      <span className="line-clamp-2 text-pretty">{children}</span>
    </span>
  );
}
