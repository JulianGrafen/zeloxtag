import { describe, expect, it } from "vitest";

import {
  claimWizardNextStep,
  claimWizardPreviousStep,
  claimWizardProgressPercent,
  claimWizardStepIndex,
  claimWizardTotalSteps,
} from "@/lib/tags/claim-flow-steps";

describe("claim-flow-steps", () => {
  it("counts six steps for new users and five for signed-in users", () => {
    expect(claimWizardTotalSteps(true)).toBe(6);
    expect(claimWizardTotalSteps(false)).toBe(5);
  });

  it("maps wizard steps to percentage progress", () => {
    expect(claimWizardProgressPercent("intro", true)).toBe(0);
    expect(claimWizardProgressPercent("makeModel", true)).toBe(17);
    expect(claimWizardProgressPercent("year", true)).toBe(33);
    expect(claimWizardProgressPercent("power", true)).toBe(50);
    expect(claimWizardProgressPercent("drivetrain", true)).toBe(67);
    expect(claimWizardProgressPercent("oilInterval", true)).toBe(83);
    expect(claimWizardProgressPercent("account", true)).toBe(100);
  });

  it("finishes at 100 percent on the last vehicle slide for signed-in users", () => {
    expect(claimWizardProgressPercent("oilInterval", false)).toBe(100);
    expect(claimWizardStepIndex("oilInterval", false)).toBe(5);
  });

  it("walks forward and backward through the ordered steps", () => {
    expect(claimWizardNextStep("makeModel", true)).toBe("year");
    expect(claimWizardNextStep("drivetrain", true)).toBe("oilInterval");
    expect(claimWizardPreviousStep("oilInterval", true)).toBe("drivetrain");
    expect(claimWizardPreviousStep("year", true)).toBe("makeModel");
    expect(claimWizardPreviousStep("makeModel", true)).toBe("intro");
  });
});
