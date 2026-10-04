"use client";

import type { ReactNode } from "react";
import { ArrowLeft, ScanLine } from "lucide-react";

import {
  ScanProcessingPanel,
  type ScanStatusHeading,
} from "@/components/documents/scan-processing-panel";
import { WizardStepProgress } from "@/components/documents/wizard-step-progress";
import {
  automotiveBackPillClassName,
  automotiveDisplayTitleClassName,
  automotiveFeaturePanelClassName,
  automotiveBodyMutedClassName,
  automotiveKickerClassName,
} from "@/components/ui/automotive";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { cn } from "@/lib/utils";

/** Fixed toast for camera-phase errors — consistent across scan wizards. */
export function WizardCameraError({ message }: { message: string }) {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
      {message}
    </div>
  );
}

export function WizardScanHeader({
  eyebrow,
  title,
  vehicleLabel,
  currentStep,
  totalSteps,
  onBack,
  backHref,
  backLabel = "Zurück",
}: {
  eyebrow: string;
  title: string;
  vehicleLabel: string;
  currentStep?: number;
  totalSteps?: number;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="mb-6 space-y-4">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className={automotiveBackPillClassName}
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>
      ) : backHref ? (
        <PressableLink
          href={backHref}
          variant="pill"
          className={automotiveBackPillClassName}
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </PressableLink>
      ) : null}

      <div className={automotiveFeaturePanelClassName}>
        <div className="vd-icon-badge !rounded-2xl">
          <ScanLine className="h-5 w-5" />
        </div>
        <p className={cn("mt-4", automotiveKickerClassName)}>{eyebrow}</p>
        <h1 className={cn("mt-2 text-[1.4rem]", automotiveDisplayTitleClassName)}>
          {title}
        </h1>
        <p className={cn("mt-1", automotiveBodyMutedClassName)}>{vehicleLabel}</p>
      </div>

      {currentStep != null && totalSteps != null && currentStep > 0 ? (
        <WizardStepProgress currentStep={currentStep} totalSteps={totalSteps} />
      ) : null}
    </header>
  );
}

export function WizardAnalyzingPanel({
  label,
  subtitle = "Einen Moment bitte…",
  footer,
  heading,
}: {
  label: string;
  subtitle?: string;
  footer?: ReactNode;
  heading?: ScanStatusHeading;
}) {
  return (
    <ScanProcessingPanel
      heading={heading}
      detail={label}
      hint={subtitle}
      footer={footer}
    />
  );
}

export function WizardShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "mx-auto flex min-h-dvh max-w-[440px] flex-col gap-0 px-4 py-6",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}
