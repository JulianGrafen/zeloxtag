"use client";

import { useCallback, useEffect, useState } from "react";

import {
  isAndroidDevice,
  isBeforeInstallPromptEvent,
  isIosDevice,
  isMobileDevice,
  isStandaloneDisplay,
  persistInstallDismissed,
  readInstallDismissed,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa/install";

export type PwaInstallPlatform = "ios" | "android" | null;

export type UsePwaInstallResult = {
  /** Show the bottom install banner. */
  visible: boolean;
  /** App already running as installed PWA. */
  isStandalone: boolean;
  platform: PwaInstallPlatform;
  /** Android/Chrome — native install prompt available. */
  canNativeInstall: boolean;
  dismiss: () => void;
  promptInstall: () => Promise<void>;
};

export function usePwaInstall(): UsePwaInstallResult {
  const [isStandalone, setIsStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(true);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<PwaInstallPlatform>(null);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());
    setDismissed(readInstallDismissed());

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
      setIsStandalone(isStandaloneDisplay());
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window
      .matchMedia("(display-mode: standalone)")
      .addEventListener("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window
        .matchMedia("(display-mode: standalone)")
        .removeEventListener("change", onDisplayModeChange);
    };
  }, []);

  const dismiss = useCallback(() => {
    persistInstallDismissed();
    setDismissed(true);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const canNativeInstall = deferredPrompt != null;
  const showIosGuide = platform === "ios";
  const showAndroidGuide = platform === "android";
  const visible =
    !isStandalone &&
    !dismissed &&
    isMobileDevice() &&
    (showIosGuide || showAndroidGuide);

  return {
    visible,
    isStandalone,
    platform,
    canNativeInstall,
    dismiss,
    promptInstall,
  };
}
