"use client";

import { ScanLine } from "lucide-react";

import { fuelScanQuotaBadgeLabel } from "@/lib/billing/fuel-scan-paywall-copy";
import { cn } from "@/lib/utils";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

type FuelScanCtaProps = {
  label?: string;
  isPro: boolean;
  remainingFreeScans: number;
  totalFreeScans: number;
  canScan: boolean;
  onScan: () => void;
  className?: string;
};

export function FuelScanCta({
  label = "Beleg scannen",
  isPro,
  remainingFreeScans,
  totalFreeScans,
  canScan,
  onScan,
  className,
}: FuelScanCtaProps) {
  const showQuotaBadge = !isPro && canScan;

  return (
    <PressableButton
      type="button"
      onClick={onScan}
      className={cn(
        "relative flex w-full flex-col items-center justify-center gap-1 rounded-2xl bg-neutral-950 px-4 py-3.5 text-[0.92rem] font-semibold text-white",
        className,
      )}
    >
      <span className="inline-flex items-center gap-2">
        <ScanLine className="h-4 w-4" aria-hidden />
        {label}
      </span>
      {showQuotaBadge ? (
        <span className="text-[0.68rem] font-medium text-white/70">
          {fuelScanQuotaBadgeLabel(remainingFreeScans, totalFreeScans)}
        </span>
      ) : null}
    </PressableButton>
  );
}
