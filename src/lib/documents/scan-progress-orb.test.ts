import { describe, expect, it } from "vitest";

import {
  activeFuelExtractStepIndex,
  activeInvoiceExtractStepIndex,
} from "./scan-progress-orb";

describe("activeFuelExtractStepIndex", () => {
  it("matches invoice step thresholds", () => {
    expect(activeFuelExtractStepIndex(10)).toBe(
      activeInvoiceExtractStepIndex(10),
    );
    expect(activeFuelExtractStepIndex(60)).toBe(1);
    expect(activeFuelExtractStepIndex(99)).toBe(2);
  });
});
