"use client";

import { PressableLink } from "./Pressable";
import { DASHBOARD_ICONS } from "./tile-icons";
import type { DashboardQuickAccessItem } from "./types";
import { cn } from "@/lib/utils";

type DashboardQuickAccessBarProps = {
  items: DashboardQuickAccessItem[];
  /** @default plain — icon row only, separated from the vehicle header */
  variant?: "plain" | "card";
  className?: string;
};

export function DashboardQuickAccessBar({
  items,
  variant = "plain",
  className,
}: DashboardQuickAccessBarProps) {
  if (items.length === 0) return null;

  const card = variant === "card";

  return (
    <nav
      aria-label="Schnellzugriff"
      className={cn(
        card
          ? "vd-anim-header rounded-2xl border border-zinc-800/90 bg-zinc-950/70 px-2 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm"
          : "vd-anim-header shrink-0 px-0 py-0.5 [animation-delay:0.06s]",
        className,
      )}
      data-tour="dashboard-quick-access"
    >
      <ul
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item) => {
          const Icon = DASHBOARD_ICONS[item.icon];

          return (
            <li key={item.id}>
              <PressableLink
                href={item.href}
                variant="row"
                className="group flex min-h-11 flex-col items-center justify-center gap-1 px-1 py-0.5 text-center"
                aria-label={item.label}
              >
                <Icon
                  className="h-6 w-6 text-zinc-100 transition-transform group-data-[pressed=true]:scale-95"
                  strokeWidth={1.65}
                  aria-hidden
                />
                <span className="text-[0.68rem] font-medium leading-tight text-zinc-400">
                  {item.label}
                </span>
              </PressableLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
