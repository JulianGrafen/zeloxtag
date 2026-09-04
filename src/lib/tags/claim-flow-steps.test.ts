import { describe, expect, it } from "vitest";

import {
  claimWizardNextStep,
  claimWizardPreviousStep,
  claimWizardProgressPercent,
  claimWizardStepIndex,
  claimWizardTotalSteps,
} from "@/lib/tags/claim-flow-steps";

describe("claim-flow-steps", () => {
  it("counts five steps for new users and four for signed-in users", () => {
    expect(claimWizardTotalSteps(true)).toBe(5);
    expect(claimWizardTotalSteps(false)).toBe(4);
  });

  it("maps wizard steps to percentage progress", () => {
    expect(claimWizardProgressPercent("intro", true)).toBe(0);
    expect(claimWizardProgressPercent("makeModel", true)).toBe(20);
    expect(claimWizardProgressPercent("year", true)).toBe(40);
    expect(claimWizardProgressPercent("power", true)).toBe(60);
    expect(claimWizardProgressPercent("drivetrain", true)).toBe(80);
    expect(claimWizardProgressPercent("account", true)).toBe(100);
  });

  it("finishes at 100 percent on the last vehicle slide for signed-in users", () => {
    expect(claimWizardProgressPercent("drivetrain", false)).toBe(100);
    expect(claimWizardStepIndex("drivetrain", false)).toBe(4);
  });

  it("walks forward and backward through the ordered steps", () => {
    expect(claimWizardNextStep("makeModel", true)).toBe("year");
    expect(claimWizardPreviousStep("year", true)).toBe("makeModel");
    expect(claimWizardPreviousStep("makeModel", true)).toBe("intro");
  });
});
