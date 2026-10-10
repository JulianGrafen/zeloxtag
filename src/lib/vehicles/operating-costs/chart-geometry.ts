import type { OperatingCostCategory } from "./types";
import { OPERATING_COST_CATEGORIES } from "./types";

import type { OperatingCostChartData } from "./chart-data";

export const STACKED_CHART_WIDTH = 320;
export const STACKED_CHART_HEIGHT = 200;
export const STACKED_CHART_PAD_X = 28;
export const STACKED_CHART_PAD_TOP = 12;
export const STACKED_CHART_PAD_BOTTOM = 28;

export type StackedBarSegment = {
  category: OperatingCostCategory;
  y: number;
  height: number;
};

export type StackedBarColumn = {
  monthKey: string;
  label: string;
  x: number;
  width: number;
  total: number;
  segments: StackedBarSegment[];
};

export type StackedChartGeometry = {
  columns: StackedBarColumn[];
  plotBottom: number;
  yTicks: number[];
  maxValue: number;
};

export type DonutSliceGeometry = {
  category: OperatingCostCategory;
  path: string;
  amount: number;
  share: number;
};

export type DonutChartGeometry = {
  slices: DonutSliceGeometry[];
  cx: number;
  cy: number;
  outerR: number;
  innerR: number;
};

function niceCeiling(value: number): number {
  if (value <= 0) return 200;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return Math.ceil(value / (step * magnitude)) * step * magnitude;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const startOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const startInner = polarToCartesian(cx, cy, innerR, startAngle);
  const endInner = polarToCartesian(cx, cy, innerR, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

export function buildStackedChartGeometry(
  chart: OperatingCostChartData,
): StackedChartGeometry | null {
  if (chart.months.length === 0) return null;

  const maxValue = niceCeiling(chart.maxMonthTotal);
  const plotTop = STACKED_CHART_PAD_TOP;
  const plotBottom = STACKED_CHART_HEIGHT - STACKED_CHART_PAD_BOTTOM;
  const plotHeight = plotBottom - plotTop;
  const plotWidth = STACKED_CHART_WIDTH - STACKED_CHART_PAD_X * 2;
  const columnCount = chart.months.length;
  const gap = 4;
  const barWidth = Math.max(6, (plotWidth - gap * (columnCount - 1)) / columnCount);

  const yScale = (amount: number) =>
    plotBottom - (amount / maxValue) * plotHeight;

  const columns: StackedBarColumn[] = chart.months.map((month, index) => {
    const x = STACKED_CHART_PAD_X + index * (barWidth + gap);
    const segments: StackedBarSegment[] = [];
    let stackBase = 0;

    for (const category of OPERATING_COST_CATEGORIES) {
      const amount = month.byCategory[category];
      if (amount <= 0) continue;
      const yTop = yScale(stackBase + amount);
      const yBottom = yScale(stackBase);
      segments.push({
        category,
        y: yTop,
        height: yBottom - yTop,
      });
      stackBase += amount;
    }

    return {
      monthKey: month.monthKey,
      label: month.label,
      x,
      width: barWidth,
      total: month.total,
      segments,
    };
  });

  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) =>
    Math.round((maxValue / tickCount) * i),
  );

  return {
    columns,
    plotBottom,
    yTicks,
    maxValue,
  };
}

export function buildDonutChartGeometry(
  chart: OperatingCostChartData,
): DonutChartGeometry | null {
  if (chart.categorySlices.length === 0) return null;

  const cx = 100;
  const cy = 100;
  const outerR = 88;
  const innerR = 58;
  let cursor = 0;

  const slices: DonutSliceGeometry[] = chart.categorySlices.map((slice) => {
    const sweep = slice.share * 360;
    const start = cursor;
    const end = cursor + sweep;
    cursor = end;
    return {
      category: slice.category,
      path: describeArc(cx, cy, outerR, innerR, start, end),
      amount: slice.amount,
      share: slice.share,
    };
  });

  return { slices, cx, cy, outerR, innerR };
}

export function formatStackedChartAxisAmount(amount: number): string {
  if (amount >= 1000) {
    return `${Math.round(amount / 100) / 10}k`;
  }
  return `${Math.round(amount)}`;
}
