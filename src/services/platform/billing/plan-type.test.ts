import { describe, expect, it } from "vitest";

import {
  mapPlanTypeToProInterval,
  mapProIntervalToPlanType,
} from "@/services/platform/billing/plan-type";

describe("plan-type mappers", () => {
  it("maps yearly to annual interval", () => {
    expect(mapPlanTypeToProInterval("yearly")).toBe("annual");
    expect(mapPlanTypeToProInterval("monthly")).toBe("monthly");
  });

  it("maps annual interval to yearly plan type", () => {
    expect(mapProIntervalToPlanType("annual")).toBe("yearly");
    expect(mapProIntervalToPlanType("monthly")).toBe("monthly");
  });
});
