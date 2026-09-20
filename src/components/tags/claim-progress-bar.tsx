"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";

import {
  claimWizardOrderedSteps,
  claimWizardProgressPercent,
  claimWizardStepIndex,
  type ClaimWizardStep,
} from "@/lib/tags/claim-flow-steps";
import { cn } from "@/lib/utils";

import { useClaimMotion } from "./claim/claim-motion";

const STEP_LABELS: Partial<Record<ClaimWizardStep, string>> = {
  makeModel: "Fahrzeug",
  year: "Baujahr",
  power: "Leistung",
  drivetrain: "Antrieb",
  oilInterval: "Service",
  preferences: "Präferenzen",
  account: "Konto",
};

type ClaimProgressBarProps = {
  step: ClaimWizardStep;
  needsAccount: boolean;
};

export function ClaimProgressBar({ step, needsAccount }: ClaimProgressBarProps) {
  const motionConfig = useClaimMotion();
  const percent = claimWizardProgressPercent(step, needsAccount);
  const currentIndex = claimWizardStepIndex(step, needsAccount);
  const ordered = claimWizardOrderedSteps(needsAccount);

  return (
    <div className="mb-5 w-full">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[0.72rem] font-medium tracking-[0.12em] text-[color:var(--vd-muted)] uppercase">
          Fortschritt
        </span>
        <span className="text-[0.82rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
          {percent} %
        </span>
      </div>

      <ol
        className="claim-stepper flex w-full items-center gap-1"
        aria-label="Registrierungsschritte"
      >
        {ordered.map((wizardStep, index) => {
          const stepNumber = index + 1;
          const isComplete = stepNumber < currentIndex;
          const isActive = wizardStep === step;
          const label = STEP_LABELS[wizardStep] ?? wizardStep;

          return (
            <li
              key={wizardStep}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-1"
              aria-current={isActive ? "step" : undefined}
            >
              <motion.div
                layout={!motionConfig.reduceMotion}
                className={cn(
                  "claim-stepper__dot flex h-7 w-7 items-center justify-center rounded-full border text-[0.65rem] font-semibold tabular-nums transition-colors",
                  isComplete &&
                    "border-[color:var(--vd-icon-badge-bg)] bg-[color:var(--vd-icon-badge-bg)] text-[color:var(--vd-icon-badge-fg)]",
                  isActive &&
                    !isComplete &&
                    "border-[color:var(--vd-text)] bg-[color:var(--vd-surface)] text-[color:var(--vd-text)] ring-2 ring-[color:var(--vd-border)]",
                  !isActive &&
                    !isComplete &&
                    "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)]",
                )}
              >
                {isComplete ? (
                  <Check className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  stepNumber
                )}
              </motion.div>
              <span
                className={cn(
                  "hidden max-w-full truncate text-center text-[0.62rem] font-medium sm:block",
                  isActive
                    ? "text-[color:var(--vd-text)]"
                    : "text-[color:var(--vd-muted)]",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`Registrierung ${percent} Prozent abgeschlossen`}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--tour-progress-track)]"
      >
        <motion.div
          className="h-full rounded-full bg-[color:var(--tour-progress-fill)]"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={
            motionConfig.reduceMotion
              ? { duration: 0 }
              : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
          }
        />
      </div>
    </div>
  );
}
