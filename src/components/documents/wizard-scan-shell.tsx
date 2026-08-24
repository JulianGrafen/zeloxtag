"use client";

import type { ReactNode } from "react";
import { ArrowLeft, LoaderCircle, ScanLine } from "lucide-react";

import { WizardStepProgress } from "@/components/documents/wizard-step-progress";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";

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
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>
      ) : backHref ? (
        <PressableLink
          href={backHref}
          variant="pill"
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </PressableLink>
      ) : null}

      <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
          <ScanLine className="h-5 w-5" />
        </div>
        <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.4rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
          {title}
        </h1>
        <p className="mt-1 text-[0.88rem] text-[color:var(--vd-muted)]">
          {vehicleLabel}
        </p>
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
}: {
  label: string;
  subtitle?: string;
  footer?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900">
        <LoaderCircle className="h-7 w-7 animate-spin text-white" />
      </div>
      <div>
        <p className="text-[0.95rem] font-semibold text-[color:var(--vd-text)]">
          {label}
        </p>
        <p className="mt-1 text-[0.8rem] text-[color:var(--vd-muted)]">
          {subtitle}
        </p>
      </div>
      {footer}
    </div>
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
