"use client";

import { ChevronRight } from "lucide-react";

import { PressableButton, PressableLink } from "./Pressable";
import { DASHBOARD_ICONS } from "./tile-icons";
import type { DashboardTileConfig, DashboardTileTone } from "./types";

interface DashboardTileProps {
  tile: DashboardTileConfig;
  onClick?: (tileId: string) => void;
}

const toneStyles: Record<
  DashboardTileTone,
  {
    iconWrap: string;
    badge: string;
  }
> = {
  default: {
    iconWrap:
      "bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-accent)] ring-1 ring-[color:var(--vd-border)]",
    badge:
      "bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-muted)] ring-1 ring-[color:var(--vd-border)]",
  },
  accent: {
    iconWrap: "bg-neutral-900 text-white ring-1 ring-neutral-900",
    badge: "bg-neutral-900 text-white ring-1 ring-neutral-900",
  },
  warning: {
    iconWrap:
      "bg-neutral-200 text-neutral-900 ring-1 ring-neutral-300",
    badge: "bg-neutral-900 text-white ring-1 ring-neutral-900",
  },
  critical: {
    iconWrap: "bg-neutral-900 text-white ring-1 ring-neutral-900",
    badge: "bg-neutral-900 text-white ring-1 ring-neutral-900",
  },
};

export function DashboardTile({ tile, onClick }: DashboardTileProps) {
  const Icon = DASHBOARD_ICONS[tile.icon];
  const tone = tile.tone ?? "default";
  const styles = toneStyles[tone];
  const href = tile.meta?.href;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] group-data-[pressed=true]:scale-90 ${styles.iconWrap}`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>

        <div className="flex items-center gap-2">
          {tile.meta?.badge ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${styles.badge}`}
            >
              {tile.meta.badge}
            </span>
          ) : null}
          <ChevronRight
            className="h-4 w-4 text-[color:var(--vd-muted)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] group-data-[pressed=true]:translate-x-1.5 group-data-[pressed=true]:text-[color:var(--vd-accent)]"
            aria-hidden
          />
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <h2 className="font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.025em] text-[color:var(--vd-text)]">
          {tile.title}
        </h2>
        {tile.meta?.subtitle ? (
          <p className="text-[0.82rem] font-medium tracking-[-0.015em] text-[color:var(--vd-accent)]">
            {tile.meta.subtitle}
          </p>
        ) : tile.description ? (
          <p className="text-[0.82rem] font-normal tracking-[-0.01em] text-[color:var(--vd-muted)]">
            {tile.description}
          </p>
        ) : null}
        {tile.meta?.subtitle && tile.description ? (
          <p className="text-[0.72rem] font-normal tracking-[-0.01em] text-[color:var(--vd-muted)]">
            {tile.description}
          </p>
        ) : null}
      </div>
    </>
  );

  const className = [
    "group relative z-10 flex min-h-[8.25rem] w-full cursor-pointer flex-col justify-between overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)]",
    "bg-[color:var(--vd-surface)] p-4 text-left shadow-[var(--vd-shadow-sm)]",
    "select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--vd-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--vd-bg)]",
    tile.featured ? "col-span-2" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <PressableLink
        href={href}
        variant="tile"
        className={className}
        aria-label={tile.title}
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
      aria-label={tile.title}
    >
      {content}
    </PressableButton>
  );
}
