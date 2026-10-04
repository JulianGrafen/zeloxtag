import type { CostYearlyPoint } from "@/lib/documents/cost-overview";

export const YEARLY_CHART_WIDTH = 320;
export const YEARLY_CHART_HEIGHT = 176;
export const YEARLY_CHART_PAD_X = 8;
export const YEARLY_CHART_PAD_TOP = 42;
export const YEARLY_CHART_PAD_BOTTOM = 24;

/** Monochrome split — matches vehicle dashboard (text vs. muted). */
export const COST_CHART_MODIFICATION_COLOR = "var(--vd-text)";
export const COST_CHART_MAINTENANCE_COLOR = "var(--vd-muted)";

export type YearlyChartPoint = CostYearlyPoint & { x: number; y: number };

export type YearlyChartGeometry = {
  points: YearlyChartPoint[];
  linePath: string;
  areaPath: string;
  plotBottom: number;
  clipId: string;
};

export type YearlySplitLineSeries = {
  modificationPath: string;
  maintenancePath: string;
  points: Array<
    CostYearlyPoint & {
      x: number;
      modificationY: number;
      maintenanceY: number;
    }
  >;
  plotBottom: number;
};

export type YearlyBarChartBar = {
  year: number;
  x: number;
  y: number;
  width: number;
  height: number;
  amount: number;
  kind: "modification" | "maintenance";
};

export type YearlyBarChartGeometry = {
  bars: YearlyBarChartBar[];
  plotBottom: number;
  groupCenters: Array<{ year: number; x: number }>;
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

function chartDims(
  dims?: {
    width: number;
    height: number;
    padX: number;
    padTop: number;
    padBottom: number;
  },
) {
  return (
    dims ?? {
      width: YEARLY_CHART_WIDTH,
      height: YEARLY_CHART_HEIGHT,
      padX: YEARLY_CHART_PAD_X,
      padTop: YEARLY_CHART_PAD_TOP,
      padBottom: YEARLY_CHART_PAD_BOTTOM,
    }
  );
}

export function buildYearlyChartGeometry(
  series: CostYearlyPoint[],
  clipId: string,
  dims?: {
    width: number;
    height: number;
    padX: number;
    padTop: number;
    padBottom: number;
  },
): YearlyChartGeometry | null {
  if (series.length === 0) return null;

  const d = chartDims(dims);
  const maxAmount = Math.max(...series.map((p) => p.amount), 1);
  const innerW = d.width - d.padX * 2;
  const plotBottom = d.height - d.padBottom;
  const innerH = plotBottom - d.padTop;

  const points: YearlyChartPoint[] = series.map((point, index) => {
    const x =
      series.length === 1
        ? d.width / 2
        : d.padX + (innerW * index) / (series.length - 1);
    const y = d.padTop + innerH - (point.amount / maxAmount) * innerH;
    return { ...point, x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${plotBottom.toFixed(1)} L ${points[0].x.toFixed(1)} ${plotBottom.toFixed(1)} Z`;

  return { points, linePath, areaPath, plotBottom, clipId };
}

export function buildYearlySplitLineGeometry(
  series: CostYearlyPoint[],
): YearlySplitLineSeries | null {
  if (series.length === 0) return null;

  const d = chartDims();
  const maxAmount = Math.max(
    ...series.flatMap((p) => [p.modificationAmount, p.maintenanceAmount]),
    1,
  );
  const innerW = d.width - d.padX * 2;
  const plotBottom = d.height - d.padBottom;
  const innerH = plotBottom - d.padTop;

  const points = series.map((point, index) => {
    const x =
      series.length === 1
        ? d.width / 2
        : d.padX + (innerW * index) / (series.length - 1);
    const modificationY =
      d.padTop + innerH - (point.modificationAmount / maxAmount) * innerH;
    const maintenanceY =
      d.padTop + innerH - (point.maintenanceAmount / maxAmount) * innerH;
    return { ...point, x, modificationY, maintenanceY };
  });

  const modificationPath = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.modificationY.toFixed(1)}`,
    )
    .join(" ");

  const maintenancePath = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.maintenanceY.toFixed(1)}`,
    )
    .join(" ");

  return { modificationPath, maintenancePath, points, plotBottom };
}

export function buildYearlyBarChartGeometry(
  series: CostYearlyPoint[],
): YearlyBarChartGeometry | null {
  if (series.length === 0) return null;

  const d = chartDims();
  const maxAmount = Math.max(
    ...series.flatMap((p) => [p.modificationAmount, p.maintenanceAmount]),
    1,
  );
  const innerW = d.width - d.padX * 2;
  const plotBottom = d.height - d.padBottom;
  const innerH = plotBottom - d.padTop;
  const groupWidth = innerW / series.length;
  const barGap = 4;
  const barWidth = Math.min(
    22,
    Math.max(10, (groupWidth - barGap * 3) / 2),
  );

  const bars: YearlyBarChartBar[] = [];
  const groupCenters: Array<{ year: number; x: number }> = [];

  series.forEach((point, index) => {
    const groupCenter = d.padX + groupWidth * index + groupWidth / 2;
    groupCenters.push({ year: point.year, x: groupCenter });

    const modHeight =
      point.modificationAmount > 0
        ? (point.modificationAmount / maxAmount) * innerH
        : 0;
    const maintHeight =
      point.maintenanceAmount > 0
        ? (point.maintenanceAmount / maxAmount) * innerH
        : 0;

    const hasMod = modHeight > 0;
    const hasMaint = maintHeight > 0;
    const singleBarInGroup = hasMod !== hasMaint;

    const modX = singleBarInGroup
      ? groupCenter - barWidth / 2
      : groupCenter - barWidth - barGap / 2;
    const maintX = singleBarInGroup
      ? groupCenter - barWidth / 2
      : groupCenter + barGap / 2;

    if (modHeight > 0) {
      bars.push({
        year: point.year,
        x: modX,
        y: plotBottom - modHeight,
        width: barWidth,
        height: modHeight,
        amount: point.modificationAmount,
        kind: "modification",
      });
    }

    if (maintHeight > 0) {
      bars.push({
        year: point.year,
        x: maintX,
        y: plotBottom - maintHeight,
        width: barWidth,
        height: maintHeight,
        amount: point.maintenanceAmount,
        kind: "maintenance",
      });
    }
  });

  return { bars, plotBottom, groupCenters };
}
