/** Equal-size square step markers for multi-step scan wizards. */
export function WizardStepProgress({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      aria-label={`Schritt ${currentStep} von ${totalSteps}`}
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
    >
      {Array.from({ length: totalSteps }, (_, index) => {
        const step = index + 1;
        const done = step < currentStep;
        const active = step === currentStep;

        return (
          <span
            key={step}
            aria-hidden
            className={[
              "size-2.5 shrink-0 rounded-[3px] transition-colors duration-300",
              done
                ? "bg-neutral-900"
                : active
                  ? "bg-neutral-700"
                  : "bg-neutral-200",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}
