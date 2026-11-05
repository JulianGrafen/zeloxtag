"use client";

import Link from "next/link";
import { Lock, MapPin, Radar } from "lucide-react";
import { useEffect, useState } from "react";

import { IOS_CARD } from "@/components/ui/ios";
import { cn } from "@/lib/utils";
import {
  formatTagScanLocation,
  formatTagScanRelative,
  type VehicleScanSummary,
} from "@/lib/tags/tag-scan-notify";

type LiveScanDashboardCardProps = {
  vehicleId: string;
  upgradeHref: string;
};

/** Hidden until the first guest scan — no empty-state clutter on the dashboard. */
export function LiveScanDashboardCard({
  vehicleId,
  upgradeHref,
}: LiveScanDashboardCardProps) {
  const [summary, setSummary] = useState<VehicleScanSummary | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/vehicle/${encodeURIComponent(vehicleId)}/scans`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: VehicleScanSummary | null) => setSummary(data))
      .catch(() => undefined);
    return () => controller.abort();
  }, [vehicleId]);

  if (!summary || summary.totalCount === 0) return null;

  const headline =
    summary.todayCount > 0
      ? `${summary.todayCount}× heute gescannt`
      : `${summary.last7DaysCount}× in den letzten 7 Tagen`;

  return (
    <div className="px-4 pt-2 sm:px-5">
      <section
        data-ios-ui
        aria-label="Live-Scans"
        className={cn("ios-ui overflow-hidden text-white", IOS_CARD)}
      >
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span
            aria-hidden
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400"
          >
            <Radar className="h-[18px] w-[18px]" strokeWidth={1.75} />
            {summary.todayCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 ring-2 ring-black" />
            ) : null}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#8E8E93]">
              Live-Scans
            </p>
            <p className="text-[15px] font-semibold tracking-[-0.01em]">
              {headline}
            </p>
          </div>
          <span className="shrink-0 tabular-nums text-xs text-[#8E8E93]">
            {summary.totalCount} gesamt
          </span>
        </div>

        {summary.isPro ? (
          <ul className="border-t border-white/[0.08]">
            {summary.recent.map((scan, index) => {
              const where = formatTagScanLocation({
                city: scan.city,
                region: null,
                country: scan.country,
              });
              return (
                <li
                  key={`${scan.scannedAt}-${index}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px]"
                >
                  <MapPin
                    className="h-3.5 w-3.5 shrink-0 text-[#8E8E93]"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {where
                      ? where.replace(/^in der Nähe von /, "")
                      : "Ort unbekannt"}
                  </span>
                  <span className="shrink-0 tabular-nums text-[#8E8E93]">
                    {formatTagScanRelative(scan.scannedAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <Link
            href={upgradeHref}
            className="flex items-center gap-3 border-t border-white/[0.08] px-4 py-3 transition-colors active:bg-white/[0.04]"
          >
            <Lock className="h-4 w-4 shrink-0 text-[#8E8E93]" aria-hidden />
            <span className="min-w-0 flex-1 text-[13px] leading-snug text-[#EBEBF5]">
              Wann und wo wurde gescannt? Uhrzeit, Ort und Verlauf mit Pro.
            </span>
            <span className="shrink-0 text-[13px] font-semibold text-[#0A84FF]">
              Pro
            </span>
          </Link>
        )}
      </section>
    </div>
  );
}
