"use client";

import { usePathname } from "next/navigation";

import { PwaInstallGuide } from "@/components/pwa/pwa-install-guide";
import { PromptCloseButton } from "@/components/ui/prompt-close-button";
import { usePwaInstall } from "@/lib/hooks/use-pwa-install";
import { isIosChrome, isIosSafari } from "@/lib/pwa/install";
import {
  DASHBOARD_FAB_CLEARANCE,
  isVehicleDashboardPath,
} from "@/lib/ui/dashboard-prompt-orchestrator";
import { cn } from "@/lib/utils";

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const onVehicleDashboard = isVehicleDashboardPath(pathname ?? "");
  const { visible, platform, canNativeInstall, dismiss, promptInstall } =
    usePwaInstall();

  if (!visible) return null;

  const guideVariant =
    platform === "ios"
      ? isIosSafari()
        ? "safari"
        : isIosChrome()
          ? "chrome"
          : "full"
      : "chrome";

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-[45] px-4",
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
          "relative mx-auto max-w-lg rounded-2xl border border-[color:var(--vd-border)]",
          "bg-[color:var(--vd-surface)]/92 p-4 pt-12 shadow-[var(--vd-shadow-modal)] backdrop-blur-xl",
        )}
      >
        <PromptCloseButton
          onClick={dismiss}
          label="Installationshinweis schließen"
        />
        <div className="min-w-0">
          <p
            id="pwa-install-title"
            className="font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]"
          >
            ZeloxTag als App installieren
          </p>
          <div id="pwa-install-desc" className="mt-2">
            <PwaInstallGuide
              compact
              variant={guideVariant}
              showChromeInstallButton={canNativeInstall}
              onChromeInstall={promptInstall}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
