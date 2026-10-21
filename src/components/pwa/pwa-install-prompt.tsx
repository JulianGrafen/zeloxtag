"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Download } from "lucide-react";

import { PwaInstallGuide } from "@/components/pwa/pwa-install-guide";
import { PwaInstallStepCarousel } from "@/components/pwa/pwa-install-step-carousel";
import { PromptCloseButton } from "@/components/ui/prompt-close-button";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/lib/hooks/use-pwa-install";
import {
  isIosChrome,
  isIosSafari,
  resolvePwaInstallGuideTrack,
  type PwaInstallGuideTrack,
} from "@/lib/pwa/install";
import {
  filterChromeInstallSteps,
  stepsForGuideTrack,
} from "@/lib/pwa/install-guide-steps";
import {
  DASHBOARD_FAB_CLEARANCE,
  isVehicleDashboardPath,
} from "@/lib/ui/dashboard-prompt-orchestrator";
import { cn } from "@/lib/utils";

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const onVehicleDashboard = isVehicleDashboardPath(pathname ?? "");
  const { visible, canNativeInstall, dismiss, promptInstall } = usePwaInstall();

  const resolved = resolvePwaInstallGuideTrack();
  const [stepIndex, setStepIndex] = useState(0);

  const activeTrack: PwaInstallGuideTrack =
    resolved === "chooser" ? "safari" : resolved;

  const steps = useMemo(() => {
    if (activeTrack === "chrome") {
      return filterChromeInstallSteps(
        stepsForGuideTrack("chrome"),
        canNativeInstall,
      );
    }
    return stepsForGuideTrack("safari");
  }, [activeTrack, canNativeInstall]);

  const isLastStep = stepIndex >= steps.length - 1;

  const resetStep = useCallback(() => {
    setStepIndex(0);
  }, []);

  const handleDismiss = useCallback(() => {
    dismiss();
    resetStep();
  }, [dismiss, resetStep]);

  const handlePrimary = useCallback(() => {
    if (!isLastStep) {
      setStepIndex((i) => Math.min(steps.length - 1, i + 1));
      return;
    }
    if (canNativeInstall && activeTrack === "chrome") {
      void promptInstall();
      return;
    }
    handleDismiss();
  }, [
    activeTrack,
    canNativeInstall,
    handleDismiss,
    isLastStep,
    promptInstall,
    steps.length,
  ]);

  if (!visible) return null;

  const primaryLabel =
    !isLastStep
      ? "Weiter"
      : canNativeInstall && activeTrack === "chrome"
        ? "App installieren"
        : "Verstanden";

  const browserLabel = isIosSafari()
    ? "Safari"
    : isIosChrome()
      ? "Chrome"
      : activeTrack === "safari"
        ? "Safari"
        : "Chrome";

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[45] px-4",
        onVehicleDashboard ? "pb-0" : "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
      )}
      style={
        onVehicleDashboard
          ? { bottom: DASHBOARD_FAB_CLEARANCE }
          : { bottom: 0 }
      }
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-desc"
    >
      <div
        className={cn(
          "pointer-events-auto relative mx-auto flex max-h-[min(75dvh,640px)] max-w-lg flex-col overflow-hidden rounded-2xl border border-[color:var(--vd-border)]",
          "bg-[color:var(--vd-surface)]/95 shadow-[var(--vd-shadow-modal)] backdrop-blur-xl",
        )}
      >
        <PromptCloseButton
          onClick={handleDismiss}
          label="Später erinnern"
        />
        <div className="flex min-h-0 flex-1 flex-col p-4 pt-12">
          <div className="min-w-0 shrink-0">
            <p
              id="pwa-install-title"
              className="font-[family-name:var(--font-display)] text-[1.02rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]"
            >
              ZeloxTag als App installieren
            </p>
            <p
              id="pwa-install-desc"
              className="mt-1 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]"
            >
              Schneller Zugriff vom Home-Bildschirm — Anleitung für{" "}
              {browserLabel}.
            </p>
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
            {resolved === "chooser" ? (
              <PwaInstallGuide
                variant="full"
                compact
                showChromeInstallButton={false}
              />
            ) : (
              <PwaInstallStepCarousel
                steps={steps}
                activeIndex={stepIndex}
                onActiveIndexChange={setStepIndex}
                slideMinHeightClassName="min-h-[11rem]"
              />
            )}
          </div>

          <div className="mt-4 shrink-0 space-y-2">
            {resolved !== "chooser" ? (
              <Button
                type="button"
                className="h-11 w-full font-semibold"
                onClick={handlePrimary}
              >
                {canNativeInstall && isLastStep && activeTrack === "chrome" ? (
                  <Download className="mr-2 h-4 w-4" aria-hidden />
                ) : null}
                {primaryLabel}
              </Button>
            ) : (
              <Button
                type="button"
                className="h-11 w-full font-semibold"
                onClick={handleDismiss}
              >
                Verstanden
              </Button>
            )}
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-2 text-center text-[0.8rem] font-medium text-[color:var(--vd-muted)]"
            >
              Später erinnern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
