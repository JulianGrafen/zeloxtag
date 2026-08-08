import { describe, expect, it } from "vitest";

import {
  normalizeAbeWizardCoverExtraction,
  stripApprovalNumberLabel,
} from "@/lib/ocr/abe-wizard-cover-normalize";

describe("abe-wizard-cover-normalize", () => {
  it("normalizes KBA digits and keeps Genehmigungsnummer", () => {
    const normalized = normalizeAbeWizardCoverExtraction({
      kbaNumber: "KBA 48185",
      approvalNumber: "AVAG9__30",
      manufacturer: "Alcar",
      designType: "Valencia",
      dimensions: "8J x 18H2",
      articleNumbers: ["AVAG9HA30"],
    });

    expect(normalized.kbaNumber).toBe("48185");
    expect(normalized.approvalNumber).toBe("AVAG9__30");
  });

  it("keeps Genehmigungsnummer when KBA is missing", () => {
    const normalized = normalizeAbeWizardCoverExtraction({
      kbaNumber: null,
      approvalNumber: "TG-9001",
      manufacturer: null,
      designType: null,
      dimensions: null,
      articleNumbers: [],
    });

    expect(normalized.kbaNumber).toBeNull();
    expect(normalized.approvalNumber).toBe("TG-9001");
  });

  it("strips Gutachten labels from approval values", () => {
    expect(
      stripApprovalNumberLabel("ABE RAD-GUTACHTEN NR.: AVAG9__30"),
    ).toBe("AVAG9__30");
    expect(stripApprovalNumberLabel("Gutachten-Nr.: TG-9001")).toBe("TG-9001");
  });
});
