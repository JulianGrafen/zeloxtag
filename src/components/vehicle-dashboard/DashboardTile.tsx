"use client";

import { ChevronRight, Lock } from "lucide-react";

import { PressableButton, PressableLink } from "./Pressable";
import {
  dashboardMenuCardClassName,
  dashboardMenuCardCompactClassName,
  dashboardMenuCardCompactMetaClassName,
  dashboardMenuCardCompactTitleClassName,
  dashboardMenuCardMetaClassName,
  dashboardMenuCardTitleClassName,
  dashboardMenuIconWrapClassName,
  dashboardMenuIconWrapCompactClassName,
  dashboardMenuTileHighlightClassName,
} from "./dashboard-menu-styles";
import { DASHBOARD_ICONS } from "./tile-icons";
import type { DashboardTileConfig, DashboardTileTone } from "./types";
import { cn } from "@/lib/utils";

interface DashboardTileProps {
  tile: DashboardTileConfig;
  compact?: boolean;
  onClick?: (tileId: string) => void;
}

const toneIconAccent: Record<DashboardTileTone, string> = {
  default: "text-zinc-100",
  accent: "text-amber-300",
  warning: "text-amber-400",
  critical: "text-red-400",
};

export function DashboardTile({
  tile,
  compact = false,
  onClick,
}: DashboardTileProps) {
  const Icon = DASHBOARD_ICONS[tile.icon];
  const tone = tile.tone ?? "default";
  const href = tile.meta?.href;
  const metaLine = tile.meta?.subtitle ?? tile.description;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            compact
              ? dashboardMenuIconWrapCompactClassName
              : dashboardMenuIconWrapClassName,
            toneIconAccent[tone],
          )}
        >
          <Icon
            className={compact ? "h-[1.125rem] w-[1.125rem]" : "h-5 w-5"}
            strokeWidth={1.75}
            aria-hidden
          />
        </span>

        {tile.locked ? (
          <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
        ) : (
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] group-data-[pressed=true]:translate-x-1 group-data-[pressed=true]:text-zinc-300"
            aria-hidden
          />
        )}
      </div>

      <div className={cn(compact ? "mt-2 space-y-0.5" : "mt-4 space-y-1.5")}>
        <h2
          className={
            compact
              ? dashboardMenuCardCompactTitleClassName
              : dashboardMenuCardTitleClassName
          }
        >
          {tile.title}
        </h2>
        {metaLine ? (
          <p
            className={
              compact
                ? dashboardMenuCardCompactMetaClassName
                : dashboardMenuCardMetaClassName
            }
          >
            {metaLine}
          </p>
        ) : null}
        {tile.meta?.badge ? (
          <p
            className={
              compact
                ? dashboardMenuCardCompactMetaClassName
                : dashboardMenuCardMetaClassName
            }
          >
            {tile.meta.badge}
          </p>
        ) : null}
      </div>
    </>
  );

  const className = cn(
    compact ? dashboardMenuCardCompactClassName : dashboardMenuCardClassName,
    tile.menuHighlight && dashboardMenuTileHighlightClassName,
    tile.featured && "col-span-2",
  );

  const tourAnchor = { "data-tour": `tile-${tile.id}` } as const;

  if (href) {
    return (
      <PressableLink
        href={href}
        variant="tile"
        className={className}
        aria-label={tile.locked ? `${tile.title} · Pro erforderlich` : tile.title}
        {...tourAnchor}
      >
        {content}
      </PressableLink>
    );
  }

  return (
    <PressableButton
      variant="tile"
      className={className}
      onClick={() => onClick?.(tile.id)}
      aria-label={tile.locked ? `${tile.title} · Pro erforderlich` : tile.title}
      {...tourAnchor}
    >
      {content}
    </PressableButton>
  );
}
