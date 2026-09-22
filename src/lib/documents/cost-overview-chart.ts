import type { CostYearlyPoint } from "@/lib/documents/cost-overview";

export const YEARLY_CHART_WIDTH = 320;
export const YEARLY_CHART_HEIGHT = 176;
export const YEARLY_CHART_PAD_X = 8;
export const YEARLY_CHART_PAD_TOP = 42;
export const YEARLY_CHART_PAD_BOTTOM = 24;

export type YearlyChartPoint = CostYearlyPoint & { x: number; y: number };

export type YearlyChartGeometry = {
  points: YearlyChartPoint[];
  linePath: string;
  areaPath: string;
  plotBottom: number;
  clipId: string;
};

/** Compact currency for point labels above the line chart. */
export function formatYearlyChartAmount(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${millions.toLocaleString("de-DE", {
      maximumFractionDigits: 1,
      minimumFractionDigits: millions % 1 === 0 ? 0 : 1,
    })} Mio. €`;
  }
  if (abs >= 10_000) {
    const thousands = amount / 1_000;
    return `${thousands.toLocaleString("de-DE", {
      maximumFractionDigits: 1,
      minimumFractionDigits: thousands % 1 === 0 ? 0 : 1,
    })} k €`;
  }
  const rounded = Math.round(amount);
  if (rounded === amount || abs < 100) {
    return amount.toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: abs < 100 ? 2 : 0,
    });
  }
  return rounded.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export function buildYearlyChartGeometry(
  series: CostYearlyPoint[],
  clipId: string,
  dims: {
    width: number;
    height: number;
    padX: number;
    padTop: number;
    padBottom: number;
  } = {
    width: YEARLY_CHART_WIDTH,
    height: YEARLY_CHART_HEIGHT,
    padX: YEARLY_CHART_PAD_X,
    padTop: YEARLY_CHART_PAD_TOP,
    padBottom: YEARLY_CHART_PAD_BOTTOM,
  },
): YearlyChartGeometry | null {
  if (series.length === 0) return null;

  const maxAmount = Math.max(...series.map((p) => p.amount), 1);
  const innerW = dims.width - dims.padX * 2;
  const plotBottom = dims.height - dims.padBottom;
  const innerH = plotBottom - dims.padTop;

  const points: YearlyChartPoint[] = series.map((point, index) => {
    const x =
      series.length === 1
        ? dims.width / 2
        : dims.padX + (innerW * index) / (series.length - 1);
    const y = dims.padTop + innerH - (point.amount / maxAmount) * innerH;
    return { ...point, x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${plotBottom.toFixed(1)} L ${points[0].x.toFixed(1)} ${plotBottom.toFixed(1)} Z`;

  return { points, linePath, areaPath, plotBottom, clipId };
}
