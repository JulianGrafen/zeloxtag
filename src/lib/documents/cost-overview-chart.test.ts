import { describe, expect, it } from "vitest";

import {
  buildYearlyBarChartGeometry,
  buildYearlyChartGeometry,
  buildYearlySplitLineGeometry,
  formatYearlyChartAmount,
  YEARLY_CHART_WIDTH,
} from "@/lib/documents/cost-overview-chart";

describe("formatYearlyChartAmount", () => {
  it("formats millions and thousands compactly", () => {
    expect(formatYearlyChartAmount(1_250_000)).toBe("1,3 Mio. €");
    expect(formatYearlyChartAmount(45_600)).toMatch(/45,6 k €/);
  });

  it("formats smaller amounts as currency", () => {
    expect(formatYearlyChartAmount(420)).toMatch(/420/);
    expect(formatYearlyChartAmount(420)).toMatch(/€/);
  });
});

describe("buildYearlyChartGeometry", () => {
  it("centers a single data point", () => {
    const geometry = buildYearlyChartGeometry(
      [{ year: 2024, amount: 1000, modificationAmount: 800, maintenanceAmount: 200 }],
      "clip-test",
    );
    expect(geometry?.points[0].x).toBe(YEARLY_CHART_WIDTH / 2);
  });

  it("scales y by max amount", () => {
    const geometry = buildYearlyChartGeometry(
      [
        { year: 2023, amount: 100, modificationAmount: 80, maintenanceAmount: 20 },
        { year: 2024, amount: 200, modificationAmount: 150, maintenanceAmount: 50 },
      ],
      "clip-test",
    );
    expect(geometry?.points[0].y).toBeGreaterThan(geometry?.points[1].y ?? 0);
  });
});

describe("buildYearlySplitLineGeometry", () => {
  it("builds separate paths for modification and maintenance", () => {
    const geometry = buildYearlySplitLineGeometry([
      { year: 2024, amount: 500, modificationAmount: 400, maintenanceAmount: 100 },
    ]);
    expect(geometry?.modificationPath).toMatch(/^M /);
    expect(geometry?.maintenancePath).toMatch(/^M /);
  });
});

describe("buildYearlyBarChartGeometry", () => {
  it("creates two bars per year when both kinds have amounts", () => {
    const geometry = buildYearlyBarChartGeometry([
      { year: 2024, amount: 500, modificationAmount: 400, maintenanceAmount: 100 },
    ]);
    expect(geometry?.bars.length).toBe(2);
  });

  it("centers a lone bar and year label on the group axis", () => {
    const geometry = buildYearlyBarChartGeometry([
      {
        year: 2026,
        amount: 704,
        modificationAmount: 704,
        maintenanceAmount: 0,
      },
    ]);
    const bar = geometry?.bars[0];
    const yearX = geometry?.groupCenters[0]?.x;
    expect(bar).toBeDefined();
    expect(yearX).toBeDefined();
    const barCenter = bar!.x + bar!.width / 2;
    expect(barCenter).toBeCloseTo(yearX!, 5);
  });
});
