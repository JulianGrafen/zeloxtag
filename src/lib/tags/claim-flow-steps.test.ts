import { describe, expect, it } from "vitest";

import {
  claimWizardNextStep,
  claimWizardPreviousStep,
  claimWizardProgressPercent,
  claimWizardStepIndex,
  claimWizardTotalSteps,
} from "@/lib/tags/claim-flow-steps";

describe("claim-flow-steps", () => {
  it("counts eight vehicle steps plus account for new users", () => {
    expect(claimWizardTotalSteps(true)).toBe(9);
    expect(claimWizardTotalSteps(false)).toBe(8);
  });

  it("maps wizard steps to percentage progress", () => {
    expect(claimWizardProgressPercent("intro", true)).toBe(0);
    expect(claimWizardProgressPercent("makeModel", true)).toBe(11);
    expect(claimWizardProgressPercent("vehiclePhoto", true)).toBe(78);
    expect(claimWizardProgressPercent("preferences", true)).toBe(89);
    expect(claimWizardProgressPercent("account", true)).toBe(100);
  });

  it("finishes at 100 percent on the preferences slide for signed-in users", () => {
    expect(claimWizardProgressPercent("preferences", false)).toBe(100);
    expect(claimWizardStepIndex("preferences", false)).toBe(8);
  });

  it("walks forward and backward through the ordered steps", () => {
    expect(claimWizardNextStep("makeModel", true)).toBe("year");
    expect(claimWizardNextStep("drivetrain", true)).toBe("oilInterval");
    expect(claimWizardNextStep("oilInterval", true)).toBe("buildPersonality");
    expect(claimWizardNextStep("buildPersonality", true)).toBe("vehiclePhoto");
    expect(claimWizardNextStep("vehiclePhoto", true)).toBe("preferences");
    expect(claimWizardPreviousStep("preferences", true)).toBe("vehiclePhoto");
    expect(claimWizardPreviousStep("oilInterval", true)).toBe("drivetrain");
    expect(claimWizardPreviousStep("year", true)).toBe("makeModel");
    expect(claimWizardPreviousStep("makeModel", true)).toBe("intro");
  });
});
