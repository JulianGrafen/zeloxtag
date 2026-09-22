import { describe, expect, it } from "vitest";

import {
  buildYearlyChartGeometry,
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
      [{ year: 2024, amount: 1000 }],
      "clip-test",
    );
    expect(geometry?.points[0].x).toBe(YEARLY_CHART_WIDTH / 2);
  });

  it("scales y by max amount", () => {
    const geometry = buildYearlyChartGeometry(
      [
        { year: 2023, amount: 100 },
        { year: 2024, amount: 200 },
      ],
      "clip-test",
    );
    expect(geometry?.points[0].y).toBeGreaterThan(geometry?.points[1].y ?? 0);
  });
});
