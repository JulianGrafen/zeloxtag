import {
  calculateBarPercentage,
  calculateBarPercentageLowerIsBetter,
} from "./calculate-bar-percentage";
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

function resolveFillPercent(metric: VehicleSpecMetric, lowerIsBetter: boolean): number {
  if (lowerIsBetter) {
    const numeric =
      typeof metric.value === "number"
        ? metric.value
        : Number.parseFloat(String(metric.value));
    return calculateBarPercentageLowerIsBetter(
      numeric,
      SHAREABLE_SPEC_POWER_TO_WEIGHT_MIN_KG_PS,
      SHAREABLE_SPEC_POWER_TO_WEIGHT_MAX_KG_PS,
    );
  }
  return calculateBarPercentage(metric.value, metric.maxValue);
}

export function CompactMetricBar({ metric, lowerIsBetter = false }: CompactMetricBarProps) {
  const fillPercent = resolveFillPercent(metric, lowerIsBetter);

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
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-zinc-800"
        role="presentation"
      >
        <div
          className="h-full rounded-full bg-white"
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </div>
  );
}
