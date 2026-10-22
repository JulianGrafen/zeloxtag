"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useAuthenticatedSession } from "@/lib/hooks/use-authenticated-session";
import {
  getDashboardPromptSnapshot,
  isVehicleDashboardPath,
  subscribeDashboardPrompts,
} from "@/lib/ui/dashboard-prompt-orchestrator";
import {
  isAndroidDevice,
  isBeforeInstallPromptEvent,
  isIosDevice,
  isMobileDevice,
  isPwaInstalled,
  isStandaloneDisplay,
  persistPwaInstalled,
  persistPwaSnooze,
  readPwaSnoozed,
  shouldOfferPwaInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa/install";

export type PwaInstallPlatform = "ios" | "android" | null;

export type UsePwaInstallResult = {
  /** Show the bottom install banner. */
  visible: boolean;
  /** App already running as installed PWA. */
  isStandalone: boolean;
  /** Persisted or runtime installed state. */
  hasInstalled: boolean;
  platform: PwaInstallPlatform;
  /** Android/Chrome — native install prompt available. */
  canNativeInstall: boolean;
  dismiss: () => void;
  promptInstall: () => Promise<void>;
};

export function usePwaInstall(): UsePwaInstallResult {
  const pathname = usePathname();
  const { isAuthenticated, isLoading: authLoading } = useAuthenticatedSession();
  const onVehicleDashboard = isVehicleDashboardPath(pathname ?? "");
  const [isStandalone, setIsStandalone] = useState(true);
  const [hasInstalled, setHasInstalled] = useState(true);
  const [, setSnoozed] = useState(true);
  const [orchestratorReady, setOrchestratorReady] = useState(!onVehicleDashboard);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<PwaInstallPlatform>(null);

  const syncInstallState = useCallback(() => {
    const standalone = isStandaloneDisplay();
    setIsStandalone(standalone);
    if (standalone) {
      persistPwaInstalled();
    }
    setHasInstalled(isPwaInstalled());
    setSnoozed(readPwaSnoozed());
  }, []);

  useEffect(() => {
    syncInstallState();

    const ios = isIosDevice();
    const android = isAndroidDevice();
    setPlatform(ios ? "ios" : android ? "android" : null);

    function onBeforeInstallPrompt(event: Event) {
      if (!isBeforeInstallPromptEvent(event)) return;
      event.preventDefault();
      setDeferredPrompt(event);
      if (isAndroidDevice() || isMobileDevice()) {
        setPlatform("android");
      }
    }

    function onDisplayModeChange() {
      syncInstallState();
    }

    function onAppInstalled() {
      persistPwaInstalled();
      syncInstallState();
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    window
      .matchMedia("(display-mode: standalone)")
      .addEventListener("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      window
        .matchMedia("(display-mode: standalone)")
        .removeEventListener("change", onDisplayModeChange);
    };
  }, [syncInstallState]);

  useEffect(() => {
    if (!onVehicleDashboard) {
      setOrchestratorReady(true);
      return;
    }

    const sync = () => {
      setOrchestratorReady(getDashboardPromptSnapshot().pwaAllowed);
    };
    sync();
    return subscribeDashboardPrompts(sync);
  }, [onVehicleDashboard]);

  const dismiss = useCallback(() => {
    persistPwaSnooze();
    setSnoozed(true);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === "accepted") {
      persistPwaInstalled();
      syncInstallState();
    }
  }, [deferredPrompt, syncInstallState]);

  const canNativeInstall = deferredPrompt != null;
  const showIosGuide = platform === "ios";
  const showAndroidGuide = platform === "android";
  const visible =
    !authLoading &&
    isAuthenticated &&
    shouldOfferPwaInstallPrompt() &&
    isMobileDevice() &&
    (showIosGuide || showAndroidGuide) &&
    orchestratorReady;

  return {
    visible,
    isStandalone,
    hasInstalled,
    platform,
    canNativeInstall,
    dismiss,
    promptInstall,
  };
}
