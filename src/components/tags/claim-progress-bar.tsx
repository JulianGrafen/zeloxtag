"use client";

import { motion } from "framer-motion";

import {
  claimWizardOrderedSteps,
  claimWizardStepIndex,
  claimWizardTotalSteps,
  type ClaimWizardFlowOptions,
  type ClaimWizardStep,
} from "@/lib/tags/claim-flow-steps";
import { cn } from "@/lib/utils";

import { useClaimMotion } from "./claim/claim-motion";

const STEP_LABELS: Partial<Record<ClaimWizardStep, string>> = {
  painPoint: "Start",
  makeModel: "Fahrzeug",
  vehiclePhoto: "Look & Sound",
  power: "Leistung",
  buildPersonality: "Vibes",
  preferences: "Fokus",
  profileName: "Name",
  account: "Konto",
};

type ClaimProgressBarProps = {
  step: ClaimWizardStep;
  flowOptions: ClaimWizardFlowOptions;
};

/** Segmented „telemetry“ progress: one lit segment per step, like a rev-light strip. */
export function ClaimProgressBar({ step, flowOptions }: ClaimProgressBarProps) {
  const motionConfig = useClaimMotion();
  const ordered = claimWizardOrderedSteps(flowOptions);
  const total = claimWizardTotalSteps(flowOptions);
  const current = claimWizardStepIndex(step, flowOptions);
  const label = STEP_LABELS[step] ?? "";

  return (
    <div className="claim-telemetry mb-5 w-full">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="claim-telemetry__kicker">Setup</p>
          <p className="claim-telemetry__label">{label}</p>
        </div>
        <p className="claim-telemetry__count" aria-hidden>
          <span className="claim-telemetry__count-current">
            {String(current).padStart(2, "0")}
          </span>
          <span className="claim-telemetry__count-total">
            /{String(total).padStart(2, "0")}
          </span>
        </p>
      </div>
      <ol
        className="mt-3 flex w-full gap-1"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label={`Schritt ${current} von ${total}: ${label}`}
      >
        {ordered.map((wizardStep, index) => {
          const position = index + 1;
          const lit = position <= current;
          return (
            <li key={wizardStep} className="claim-telemetry__segment">
              <motion.span
                className={cn(
                  "claim-telemetry__fill",
                  position === current && "claim-telemetry__fill--active",
                )}
                initial={false}
                animate={{ scaleX: lit ? 1 : 0 }}
                transition={
                  motionConfig.reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
                }
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
