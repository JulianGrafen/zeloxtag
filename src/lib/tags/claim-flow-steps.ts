export type ClaimWizardStep =
  | "intro"
  | "makeModel"
  | "year"
  | "power"
  | "drivetrain"
  | "account";

const VEHICLE_STEPS: ClaimWizardStep[] = [
  "makeModel",
  "year",
  "power",
  "drivetrain",
];

export function claimWizardTotalSteps(needsAccount: boolean): number {
  return needsAccount ? VEHICLE_STEPS.length + 1 : VEHICLE_STEPS.length;
}

export function claimWizardOrderedSteps(
  needsAccount: boolean,
): ClaimWizardStep[] {
  return needsAccount ? [...VEHICLE_STEPS, "account"] : [...VEHICLE_STEPS];
}

/** 1-based index among progress steps; 0 when intro or unknown. */
export function claimWizardStepIndex(
  step: ClaimWizardStep,
  needsAccount: boolean,
): number {
  if (step === "intro") return 0;
  const order = claimWizardOrderedSteps(needsAccount);
  const index = order.indexOf(step);
  return index >= 0 ? index + 1 : 0;
}

export function claimWizardProgressPercent(
  step: ClaimWizardStep,
  needsAccount: boolean,
): number {
  const index = claimWizardStepIndex(step, needsAccount);
  if (index <= 0) return 0;
  const total = claimWizardTotalSteps(needsAccount);
  return Math.round((index / total) * 100);
}

export function claimWizardPreviousStep(
  step: ClaimWizardStep,
  needsAccount: boolean,
): ClaimWizardStep {
  const order = claimWizardOrderedSteps(needsAccount);
  const index = order.indexOf(step);
  if (index <= 0) return "intro";
  return order[index - 1] ?? "intro";
}

export function claimWizardNextStep(
  step: ClaimWizardStep,
  needsAccount: boolean,
): ClaimWizardStep | null {
  const order = claimWizardOrderedSteps(needsAccount);
  const index = order.indexOf(step);
  if (index < 0 || index >= order.length - 1) return null;
  return order[index + 1] ?? null;
}
