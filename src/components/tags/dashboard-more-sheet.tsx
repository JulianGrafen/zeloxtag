"use client";

import { ChevronRight, X } from "lucide-react";

import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { DASHBOARD_ICONS } from "@/components/vehicle-dashboard/tile-icons";
import type { DashboardTileConfig } from "@/components/vehicle-dashboard/types";

type DashboardMoreSheetProps = {
  open: boolean;
  tiles: DashboardTileConfig[];
  onClose: () => void;
  onManualEntry?: () => void;
};

export function DashboardMoreSheet({
  open,
  tiles,
  onClose,
  onManualEntry,
}: DashboardMoreSheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[55] flex items-end justify-center bg-neutral-950/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-more-title"
    >
      <div className="flex max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.5rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow)] sm:rounded-[1.5rem]">
        <header className="flex items-start gap-3 border-b border-[color:var(--vd-border)] px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <h2
              id="dashboard-more-title"
              className="font-[family-name:var(--font-display)] text-[1.15rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]"
            >
              Mehr
            </h2>
            <p className="mt-1 text-[0.82rem] text-[color:var(--vd-muted)]">
              Service, Umbauten, Technik und Werkstatt-Zugang
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-[color:var(--vd-muted)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <ul className="min-h-0 flex-1 divide-y divide-[color:var(--vd-border)] overflow-y-auto px-2 py-2">
          {tiles.map((tile) => {
            const Icon = DASHBOARD_ICONS[tile.icon];
            const href = tile.meta?.href;
            if (!href) return null;

            return (
              <li key={tile.id}>
                <PressableLink
                  href={href}
                  variant="row"
                  onClick={onClose}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-accent)] ring-1 ring-[color:var(--vd-border)]">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-[color:var(--vd-text)]">
                      {tile.title}
                    </span>
                    {tile.meta?.subtitle ? (
                      <span className="mt-0.5 block truncate text-[0.78rem] text-[color:var(--vd-muted)]">
                        {tile.meta.subtitle}
                      </span>
                    ) : tile.description ? (
                      <span className="mt-0.5 block text-[0.78rem] text-[color:var(--vd-muted)]">
                        {tile.description}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)]"
                    aria-hidden
                  />
                </PressableLink>
              </li>
            );
          })}
        </ul>

        {onManualEntry ? (
          <footer className="border-t border-[color:var(--vd-border)] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => {
                onClose();
                onManualEntry();
              }}
              className="w-full text-center text-[0.82rem] font-medium text-[color:var(--vd-muted)] underline decoration-[color:var(--vd-border)] underline-offset-4"
            >
              Manuell eintragen (ohne Beleg)
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
