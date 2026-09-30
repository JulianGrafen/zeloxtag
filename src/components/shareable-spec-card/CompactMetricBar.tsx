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
  metric: VehicleSpecMetric;
  /** When true, lower numeric values fill the bar more (kg/PS). */
  lowerIsBetter?: boolean;
};

function formatMetricValue(metric: VehicleSpecMetric): string {
  const value =
    typeof metric.value === "number"
      ? metric.value.toLocaleString("de-DE")
      : metric.value;
  const unit = metric.unit ? ` ${metric.unit}` : "";
  return `${value}${unit}`.trim();
}

function resolveFilledSegments(
  metric: VehicleSpecMetric,
  lowerIsBetter: boolean,
): number {
  if (lowerIsBetter) {
    const numeric =
      typeof metric.value === "number"
        ? metric.value
        : Number.parseFloat(String(metric.value));
    if (!Number.isFinite(numeric)) return 0;
    return filledSegmentsLowerIsBetter(
      numeric,
      SHAREABLE_SPEC_POWER_TO_WEIGHT_MIN_KG_PS,
      SHAREABLE_SPEC_POWER_TO_WEIGHT_MAX_KG_PS,
    );
  }

  const numeric =
    typeof metric.value === "number"
      ? metric.value
      : Number.parseFloat(String(metric.value));
  if (!Number.isFinite(numeric)) return 0;
  return filledSegments(numeric, metric.maxValue);
}

export function CompactMetricBar({ metric, lowerIsBetter = false }: CompactMetricBarProps) {
  const filled = resolveFilledSegments(metric, lowerIsBetter);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4">
        <span className="font-mono text-[22px] font-medium uppercase tracking-[0.2em] text-zinc-400">
          {metric.label}
        </span>
        <div className="flex shrink-0 items-baseline gap-3 text-right">
          <span className="text-[38px] font-bold tabular-nums tracking-tight text-white">
            {formatMetricValue(metric)}
          </span>
          {metric.delta ? (
            <span className="text-[26px] font-semibold tabular-nums text-emerald-400">
              {metric.delta}
            </span>
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
