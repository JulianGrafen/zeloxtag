import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type IconBadgeTone =
  | "blue"
  | "amber"
  | "green"
  | "red"
  | "purple"
  | "neutral";

const ICON_BADGE_TONE_CLASS: Record<IconBadgeTone, string> = {
  blue: "bg-blue-500/15 text-blue-400",
  amber: "bg-amber-500/15 text-amber-400",
  green: "bg-emerald-500/15 text-emerald-400",
  red: "bg-red-500/15 text-red-400",
  purple: "bg-violet-500/15 text-violet-400",
  neutral: "bg-zinc-500/20 text-zinc-300",
};

type IconBadgeBaseProps = {
  tone?: IconBadgeTone;
  className?: string;
};

export type IconBadgeProps = IconBadgeBaseProps &
  (
    | { icon: LucideIcon; children?: never }
    | { icon?: never; children: ReactNode }
  );

export function IconBadge({
  icon: Icon,
  children,
  tone = "neutral",
  className,
}: IconBadgeProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
        ICON_BADGE_TONE_CLASS[tone],
        className,
      )}
    >
      {Icon ? <Icon className="h-4 w-4" strokeWidth={1.75} /> : children}
    </span>
  );
}
