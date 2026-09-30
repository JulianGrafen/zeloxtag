import {
  SHARE_CARD_QUARTETT_SEGMENT_CLASS,
  ShowcaseQuartettSegmentBar,
} from "@/components/public-showcase/showcase-quartett-segment-bar";
import {
  filledSegments,
  filledSegmentsLowerIsBetter,
} from "@/components/public-showcase/showcase-quartett-scales";

import {
  SHAREABLE_SPEC_POWER_TO_WEIGHT_MAX_KG_PS,
  SHAREABLE_SPEC_POWER_TO_WEIGHT_MIN_KG_PS,
} from "./constants";
import type { VehicleSpecMetric } from "./types";

type CompactMetricBarProps = {
  metric?: VehicleSpecMetric;
  label?: string;
  valueText?: string;
  amount?: number;
  scaleMax?: number;
  scaleMin?: number;
  lowerIsBetter?: boolean;
  compact?: boolean;
  dense?: boolean;
};

function resolveFilledSegments(
  amount: number,
  scaleMax: number,
  scaleMin: number | undefined,
  lowerIsBetter: boolean,
): number {
  if (lowerIsBetter) {
    const min = scaleMin ?? SHAREABLE_SPEC_POWER_TO_WEIGHT_MIN_KG_PS;
    const max = scaleMax ?? SHAREABLE_SPEC_POWER_TO_WEIGHT_MAX_KG_PS;
    return filledSegmentsLowerIsBetter(amount, min, max);
  }
  return filledSegments(amount, scaleMax);
}

export function CompactMetricBar({
  metric,
  label: labelProp,
  valueText: valueTextProp,
  amount: amountProp,
  scaleMax: scaleMaxProp,
  scaleMin,
  lowerIsBetter = false,
  compact = false,
  dense = false,
}: CompactMetricBarProps) {
  const label = labelProp ?? metric?.label ?? "";
  const valueText =
    valueTextProp ??
    (metric
      ? `${typeof metric.value === "number" ? metric.value.toLocaleString("de-DE") : metric.value}${metric.unit ? ` ${metric.unit}` : ""}`.trim()
      : "");

  const amount =
    amountProp ??
    (typeof metric?.value === "number"
      ? metric.value
      : Number.parseFloat(String(metric?.value ?? "")));

  const scaleMax = scaleMaxProp ?? metric?.maxValue ?? 100;

  const filled = Number.isFinite(amount)
    ? resolveFilledSegments(amount, scaleMax, scaleMin ?? metric?.scaleMin, lowerIsBetter)
    : 0;

  const labelClass = dense
    ? "font-mono text-[15px] font-medium uppercase tracking-[0.14em] text-zinc-400"
    : compact
      ? "font-mono text-[18px] font-medium uppercase tracking-[0.16em] text-zinc-400"
      : "font-mono text-[22px] font-medium uppercase tracking-[0.2em] text-zinc-400";
  const valueClass = dense
    ? "text-[24px] font-bold tabular-nums tracking-tight text-white"
    : compact
      ? "text-[30px] font-bold tabular-nums tracking-tight text-white"
      : "text-[38px] font-bold tabular-nums tracking-tight text-white";
  const deltaClass = dense
    ? "text-[18px] font-semibold tabular-nums text-emerald-400"
    : compact
      ? "text-[22px] font-semibold tabular-nums text-emerald-400"
      : "text-[26px] font-semibold tabular-nums text-emerald-400";

  return (
    <div
      className={
        dense ? "flex flex-col gap-1" : compact ? "flex flex-col gap-2" : "flex flex-col gap-3"
      }
    >
      <div className="flex items-end justify-between gap-3">
        <span className={`min-w-0 ${labelClass}`}>{label}</span>
        <div className="flex min-w-0 shrink items-baseline justify-end gap-2 text-right">
          <span className={valueClass}>{valueText}</span>
          {metric?.delta ? (
            <span className={deltaClass}>{metric.delta}</span>
          ) : null}
        </div>
      </div>
      <ShowcaseQuartettSegmentBar
        filled={filled}
        className="gap-1 px-1"
        segmentClassName={SHARE_CARD_QUARTETT_SEGMENT_CLASS}
      />
    </div>
  );
}
