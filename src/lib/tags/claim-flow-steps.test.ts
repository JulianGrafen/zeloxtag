import { describe, expect, it } from "vitest";

import {
  claimWizardNextStep,
  claimWizardPreviousStep,
  claimWizardProgressPercent,
  claimWizardStepIndex,
  claimWizardTotalSteps,
} from "@/lib/tags/claim-flow-steps";

describe("claim-flow-steps", () => {
  it("counts seven steps for new users and six for signed-in users", () => {
    expect(claimWizardTotalSteps(true)).toBe(7);
    expect(claimWizardTotalSteps(false)).toBe(6);
  });

  it("maps wizard steps to percentage progress", () => {
    expect(claimWizardProgressPercent("intro", true)).toBe(0);
    expect(claimWizardProgressPercent("makeModel", true)).toBe(14);
    expect(claimWizardProgressPercent("year", true)).toBe(29);
    expect(claimWizardProgressPercent("power", true)).toBe(43);
    expect(claimWizardProgressPercent("drivetrain", true)).toBe(57);
    expect(claimWizardProgressPercent("oilInterval", true)).toBe(71);
    expect(claimWizardProgressPercent("preferences", true)).toBe(86);
    expect(claimWizardProgressPercent("account", true)).toBe(100);
  });

  it("finishes at 100 percent on the preferences slide for signed-in users", () => {
    expect(claimWizardProgressPercent("preferences", false)).toBe(100);
    expect(claimWizardStepIndex("preferences", false)).toBe(6);
  });

  it("walks forward and backward through the ordered steps", () => {
    expect(claimWizardNextStep("makeModel", true)).toBe("year");
    expect(claimWizardNextStep("drivetrain", true)).toBe("oilInterval");
    expect(claimWizardNextStep("oilInterval", true)).toBe("preferences");
    expect(claimWizardPreviousStep("preferences", true)).toBe("oilInterval");
    expect(claimWizardPreviousStep("oilInterval", true)).toBe("drivetrain");
    expect(claimWizardPreviousStep("year", true)).toBe("makeModel");
    expect(claimWizardPreviousStep("makeModel", true)).toBe("intro");
  });
});
