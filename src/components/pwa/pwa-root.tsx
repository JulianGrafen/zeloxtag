"use client";

import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { PwaServiceWorkerRegister } from "@/components/pwa/pwa-service-worker-register";

/** Client-side PWA registration + install onboarding. */
export function PwaRoot() {
  return (
    <>
      <PwaServiceWorkerRegister />
      <PwaInstallPrompt />
    </>
  );
}
