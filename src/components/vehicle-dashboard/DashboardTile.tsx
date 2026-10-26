"use client";

import {
  IOS_CARD,
  IconBadge,
  type IconBadgeTone,
} from "@/components/ui/ios";
import { cn } from "@/lib/utils";

import { PressableButton, PressableLink } from "./Pressable";
import { DASHBOARD_ICONS } from "./tile-icons";
import type { DashboardTileConfig, DashboardTileTone } from "./types";

interface DashboardTileProps {
  tile: DashboardTileConfig;
  compact?: boolean;
  onClick?: (tileId: string) => void;
}

const TILE_ICON_BADGE_CLASS = "bg-white/[0.08] text-white";

const STATUS_PILL_CLASS: Record<IconBadgeTone, string> = {
  amber: "bg-amber-500/15 text-amber-400",
  red: "bg-red-500/15 text-red-400",
  blue: "bg-blue-500/15 text-blue-400",
  green: "bg-emerald-500/15 text-emerald-400",
  purple: "bg-violet-500/15 text-violet-400",
  neutral: "bg-white/[0.08] text-[#8E8E93]",
};

const PRO_BADGE_LABEL = "Pro";

type TileStatus = { label: string; tone: IconBadgeTone };

function resolveTileStatus(tile: DashboardTileConfig): TileStatus | null {
  if (tile.locked) return { label: PRO_BADGE_LABEL, tone: "neutral" };
  const badge = tile.meta?.badge;
  if (!badge) return null;
  const tone: IconBadgeTone =
    tile.tone === "critical"
      ? "red"
      : tile.tone === "warning"
        ? "amber"
        : "neutral";
  return { label: badge, tone };
}

function TileContent({
  tile,
  compact,
}: {
  tile: DashboardTileConfig;
  compact: boolean;
}) {
  const Icon = DASHBOARD_ICONS[tile.icon];
  const status = resolveTileStatus(tile);
  const metaLine =
    tile.locked ? null : (tile.meta?.subtitle ?? tile.description ?? null);

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <IconBadge icon={Icon} className={TILE_ICON_BADGE_CLASS} />
        {status ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
              STATUS_PILL_CLASS[status.tone],
            )}
          >
            {status.label}
          </span>
        ) : null}
      </div>

      <div className={cn("min-w-0", compact ? "mt-2 space-y-0.5" : "mt-4 space-y-1")}>
        <h2 className="truncate text-[15px] font-semibold leading-tight text-white">
          {tile.title}
        </h2>
        {metaLine ? (
          <p className="line-clamp-2 text-xs leading-snug tabular-nums text-[#8E8E93]">
            {metaLine}
          </p>
        ) : null}
      </div>
    </>
  );
}

export function DashboardTile({
  tile,
  compact = false,
  onClick,
}: DashboardTileProps) {
  const href = tile.meta?.href;
  const className = cn(
    IOS_CARD,
    "group relative flex w-full min-w-0 select-none flex-col justify-between overflow-hidden text-left",
    "transition-[transform,background-color] duration-150 active:bg-[#2C2C2E] group-data-[pressed=true]:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25",
    compact ? "min-h-[6.875rem] p-3" : "min-h-[8.5rem] p-4",
    tile.featured && "col-span-2",
  );
  const ariaLabel = tile.locked
    ? `${tile.title} · Pro erforderlich`
    : tile.title;
  const tourAnchor = { "data-tour": `tile-${tile.id}` } as const;
  const content = <TileContent tile={tile} compact={compact} />;

  if (href) {
    return (
      <PressableLink
        href={href}
        variant="tile"
        className={className}
        aria-label={ariaLabel}
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
      aria-label={ariaLabel}
      {...tourAnchor}
    >
      {content}
    </PressableButton>
  );
}
