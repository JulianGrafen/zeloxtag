/**
 * Onboarding wizard steps. Kept short on purpose — every extra screen loses
 * owners. Oil interval uses defaults (editable later in Fahrzeugdaten).
 *
 * - `makeModel`: Marke, Modell, Baujahr, VIN
 * - `vehiclePhoto`: „Look & Sound“ — Fahrzeugfoto + optionaler Soundcheck
 * - `power`: Leistung, Fahrwerte, Antrieb, Kraftstoff
 */
export type ClaimWizardStep =
  | "intro"
  | "painPoint"
  | "makeModel"
  | "vehiclePhoto"
  | "power"
  | "buildPersonality"
  | "preferences"
  | "profileName"
  | "account";

export type ClaimWizardFlowOptions = {
  needsAccount: boolean;
  includeProfileName: boolean;
};

const VEHICLE_STEPS: ClaimWizardStep[] = [
  "painPoint",
  "makeModel",
  "vehiclePhoto",
  "power",
  "buildPersonality",
  "preferences",
];

export function claimWizardOrderedSteps(
  options: ClaimWizardFlowOptions,
): ClaimWizardStep[] {
  const steps: ClaimWizardStep[] = [...VEHICLE_STEPS];
  if (options.includeProfileName) {
    steps.push("profileName");
  }
  return options.needsAccount ? [...steps, "account"] : steps;
}

export function claimWizardTotalSteps(options: ClaimWizardFlowOptions): number {
  return claimWizardOrderedSteps(options).length;
}

/** 1-based index among progress steps; 0 when intro or unknown. */
export function claimWizardStepIndex(
  step: ClaimWizardStep,
  options: ClaimWizardFlowOptions,
): number {
  if (step === "intro") return 0;
  const order = claimWizardOrderedSteps(options);
  const index = order.indexOf(step);
  return index >= 0 ? index + 1 : 0;
}

export function claimWizardProgressPercent(
  step: ClaimWizardStep,
  options: ClaimWizardFlowOptions,
): number {
  const index = claimWizardStepIndex(step, options);
  if (index <= 0) return 0;
  const total = claimWizardTotalSteps(options);
  return Math.round((index / total) * 100);
}

export function claimWizardPreviousStep(
  step: ClaimWizardStep,
  options: ClaimWizardFlowOptions,
): ClaimWizardStep {
  const order = claimWizardOrderedSteps(options);
  const index = order.indexOf(step);
  if (index <= 0) return "intro";
  return order[index - 1] ?? "intro";
}

export function claimWizardNextStep(
  step: ClaimWizardStep,
  options: ClaimWizardFlowOptions,
): ClaimWizardStep | null {
  const order = claimWizardOrderedSteps(options);
  const index = order.indexOf(step);
  if (index < 0 || index >= order.length - 1) return null;
  return order[index + 1] ?? null;
}
