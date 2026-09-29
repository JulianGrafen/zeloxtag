import { describe, expect, it } from "vitest";

import {
  claimWizardNextStep,
  claimWizardPreviousStep,
  claimWizardProgressPercent,
  claimWizardStepIndex,
  claimWizardTotalSteps,
  type ClaimWizardFlowOptions,
} from "@/lib/tags/claim-flow-steps";

const withProfileAndAccount: ClaimWizardFlowOptions = {
  needsAccount: true,
  includeProfileName: true,
};

const signedInWithProfile: ClaimWizardFlowOptions = {
  needsAccount: false,
  includeProfileName: true,
};

describe("claim-flow-steps", () => {
  it("counts steps with profile and account options", () => {
    expect(claimWizardTotalSteps(withProfileAndAccount)).toBe(10);
    expect(claimWizardTotalSteps(signedInWithProfile)).toBe(9);
    expect(
      claimWizardTotalSteps({ needsAccount: false, includeProfileName: false }),
    ).toBe(8);
  });

  it("maps wizard steps to percentage progress", () => {
    expect(claimWizardProgressPercent("intro", withProfileAndAccount)).toBe(0);
    expect(claimWizardProgressPercent("makeModel", withProfileAndAccount)).toBe(
      10,
    );
    expect(claimWizardProgressPercent("profileName", withProfileAndAccount)).toBe(
      90,
    );
    expect(claimWizardProgressPercent("account", withProfileAndAccount)).toBe(
      100,
    );
  });

  it("finishes at 100 percent on the preferences slide when profile is skipped", () => {
    const opts = { needsAccount: false, includeProfileName: false };
    expect(claimWizardProgressPercent("preferences", opts)).toBe(100);
    expect(claimWizardStepIndex("preferences", opts)).toBe(8);
  });

  it("walks forward and backward through the ordered steps", () => {
    expect(claimWizardNextStep("makeModel", withProfileAndAccount)).toBe(
      "vehiclePhoto",
    );
    expect(claimWizardNextStep("preferences", withProfileAndAccount)).toBe(
      "profileName",
    );
    expect(claimWizardNextStep("profileName", withProfileAndAccount)).toBe(
      "account",
    );
    expect(claimWizardPreviousStep("account", withProfileAndAccount)).toBe(
      "profileName",
    );
    expect(claimWizardPreviousStep("year", withProfileAndAccount)).toBe(
      "vehiclePhoto",
    );
  });
});
